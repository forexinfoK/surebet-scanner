/**
 * Surebet Scanner 2.0 – OpenLigaDB adapter (isolated module)
 * No dependency on the v1.3.0 application.
 */
export const ADAPTER_VERSION = "0.1.0";
export const SOURCE_ID = "openligadb";
const BASE_URL = "https://api.openligadb.de";
const DEFAULT_TIMEOUT_MS = 10000;

function parseUtc(value) {
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function requiredText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeOpenLigaMatch(match, options = {}) {
  const fetchedAt = options.fetchedAtUtc || new Date().toISOString();
  const nowMs = options.nowMs ?? Date.now();
  const startUtc = parseUtc(match?.MatchDateTimeUTC);
  const homeName = requiredText(match?.Team1?.TeamName);
  const awayName = requiredText(match?.Team2?.TeamName);
  const hasParticipants = Boolean(homeName && awayName);
  const finished = match?.MatchIsFinished;
  let status = "unknown";
  if (finished === true) status = "completed";
  else if (finished === false && startUtc && Date.parse(startUtc) > nowMs) status = "scheduled";
  else if (finished === false && startUtc && Date.parse(startUtc) <= nowMs) status = "unknown";

  const reasons = [];
  if (match?.MatchID == null) reasons.push("MISSING_EVENT_ID");
  if (!startUtc) reasons.push("MISSING_START_TIME");
  if (!hasParticipants) reasons.push("MISSING_PARTICIPANT");
  if (status === "unknown") reasons.push("UNKNOWN_STATUS");
  // OpenLigaDB's Match payload does not provide a per-match source-update timestamp.
  reasons.push("SOURCE_TIMESTAMP_MISSING");

  const hardFailure = reasons.some(code =>
    ["MISSING_EVENT_ID", "MISSING_START_TIME", "MISSING_PARTICIPANT", "UNKNOWN_STATUS"].includes(code)
  );

  return {
    event_id: match?.MatchID != null ? SOURCE_ID + ":" + String(match.MatchID) : null,
    sport: "football",
    competition_id: match?.LeagueShortcut ? String(match.LeagueShortcut) : null,
    competition_name: requiredText(match?.LeagueName),
    season: match?.LeagueSeason != null ? String(match.LeagueSeason) : null,
    scheduled_start_utc: startUtc,
    status,
    participants: hasParticipants ? {
      home_team: {
        name: homeName,
        source_name: homeName,
        source_entity_id: match?.Team1?.TeamId ?? null
      },
      away_team: {
        name: awayName,
        source_name: awayName,
        source_entity_id: match?.Team2?.TeamId ?? null
      }
    } : null,
    source_records: [{
      source_id: SOURCE_ID,
      source_event_id: match?.MatchID ?? null,
      fetched_at_utc: fetchedAt,
      source_updated_at_utc: null,
      http_status: options.httpStatus ?? 200,
      adapter_version: ADAPTER_VERSION
    }],
    data_quality: {
      grade: hardFailure ? "C" : "B",
      reasons,
      eligible: !hardFailure
    },
    last_verified_at_utc: fetchedAt
  };
}

async function getJson(path, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(BASE_URL + path, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("HTTP_" + response.status);
    const data = await response.json();
    if (data == null || (typeof data !== "object")) throw new Error("INVALID_JSON_SHAPE");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAvailableLeagues(season, options = {}) {
  if (!Number.isInteger(Number(season))) throw new Error("INVALID_SEASON");
  const data = await getJson("/getavailableleagues/" + encodeURIComponent(String(season)), options);
  if (!Array.isArray(data)) throw new Error("INVALID_LEAGUE_LIST");
  return data;
}

export async function getLeagueMatches(shortcut, season, options = {}) {
  if (!requiredText(shortcut)) throw new Error("MISSING_LEAGUE_SHORTCUT");
  if (!Number.isInteger(Number(season))) throw new Error("INVALID_SEASON");
  const path = "/getmatchdata/" + encodeURIComponent(shortcut.trim()) + "/" + encodeURIComponent(String(season));
  const data = await getJson(path, options);
  if (!Array.isArray(data)) throw new Error("INVALID_MATCH_LIST");
  const fetchedAtUtc = options.fetchedAtUtc || new Date().toISOString();
  return data.map(match => normalizeOpenLigaMatch(match, {
    fetchedAtUtc,
    nowMs: options.nowMs,
    httpStatus: 200
  }));
}

export function getTodayScheduledMatches(matches, now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
  return matches.filter(match => {
    if (!match?.data_quality?.eligible || match.status !== "scheduled" || !match.scheduled_start_utc) return false;
    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Vienna",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(match.scheduled_start_utc));
    return localDate === date && Date.parse(match.scheduled_start_utc) > now.getTime();
  });
}
