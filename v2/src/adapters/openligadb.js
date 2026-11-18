/**
 * OpenLigaDB adapter for Surebet Scanner 2.0.
 * Isolated module: does not import or modify the v1.3.0 application.
 */
const SOURCE_ID = "openligadb";
const API_ROOT = "https://api.openligadb.de";
const ADAPTER_VERSION = "0.1.0";

function validIso(value) {
  return typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    /(Z|[+-]\d{2}:?\d{2})$/.test(value);
}

function asUtc(value) {
  return validIso(value) ? new Date(value).toISOString() : null;
}

function mapMatchStatus(match, nowMs) {
  if ((match?.matchIsFinished ?? match?.MatchIsFinished) === true) return "completed";
  if ((match?.matchIsFinished ?? match?.MatchIsFinished) !== false) return "unknown";

  const start = asUtc((match?.matchDateTimeUTC ?? match?.MatchDateTimeUTC));
  if (!start) return "unknown";

  // OpenLigaDB's MatchIsFinished=false alone cannot distinguish a future
  // fixture from a match that has started. Do not label past kickoffs scheduled.
  return Date.parse(start) > nowMs ? "scheduled" : "unknown";
}

function normalizeMatch(match, options = {}) {
  const fetchedAtUtc = options.fetchedAtUtc || new Date().toISOString();
  const nowMs = options.nowMs ?? Date.now();
  const start = asUtc(match?.MatchDateTimeUTC);
  const team1 = match?.team1 ?? match?.Team1;
  const team2 = match?.team2 ?? match?.Team2;
  const homeName = team1?.teamName ?? team1?.TeamName;
  const awayName = team2?.teamName ?? team2?.TeamName;
  const home = typeof homeName === "string" ? homeName.trim() : "";
  const away = typeof awayName === "string" ? awayName.trim() : "";
  const status = mapMatchStatus(match, nowMs);
  const reasons = [];

  if ((match?.matchID ?? match?.MatchID) == null) reasons.push("MISSING_EVENT_ID");
  if (!start) reasons.push("MISSING_START_TIME");
  if (!home || !away) reasons.push("MISSING_PARTICIPANT");
  if (status === "unknown") reasons.push("UNKNOWN_STATUS");

  const hardFailure = reasons.some(code =>
    ["MISSING_EVENT_ID", "MISSING_START_TIME", "MISSING_PARTICIPANT", "UNKNOWN_STATUS"].includes(code)
  );
  const sourceUpdatedAtUtc = asUtc(match?.lastUpdateDateTime ?? match?.LastUpdateDateTime);
  if (!sourceUpdatedAtUtc) reasons.push("SOURCE_TIMESTAMP_MISSING");

  const leagueShortcut = String(match?.leagueShortcut || match?.LeagueShortcut || options.leagueShortcut || "").trim();
  const leagueName = String(match?.leagueName || match?.LeagueName || options.leagueName || "").trim();
  const season = match?.leagueSeason ?? match?.LeagueSeason ?? options.season ?? null;

  return {
    event_id: (match?.matchID ?? match?.MatchID) != null ? SOURCE_ID + ":" + String(match.matchID ?? match.MatchID) : null,
    sport: "football",
    competition_id: leagueShortcut || null,
    competition_name: leagueName || null,
    season: season == null ? null : String(season),
    scheduled_start_utc: start,
    status,
    participants: home && away ? {
      home_team: {
        name: home,
        source_name: home,
        source_entity_id: team1?.teamId ?? team1?.TeamId ?? null
      },
      away_team: {
        name: away,
        source_name: away,
        source_entity_id: team2?.teamId ?? team2?.TeamId ?? null
      }
    } : null,
    source_records: [{
      source_id: SOURCE_ID,
      source_event_id: match?.matchID ?? match?.MatchID ?? null,
      fetched_at_utc: fetchedAtUtc,
      source_updated_at_utc: sourceUpdatedAtUtc,
      http_status: options.httpStatus ?? 200,
      adapter_version: ADAPTER_VERSION
    }],
    data_quality: {
      grade: hardFailure ? "C" : reasons.length ? "B" : "A",
      reasons,
      eligible: !hardFailure
    },
    last_verified_at_utc: fetchedAtUtc
  };
}

async function fetchLeagueMatches({
  leagueShortcut,
  season,
  timeoutMs = 10000,
  fetchImpl = globalThis.fetch,
  now = () => Date.now()
} = {}) {
  if (!leagueShortcut || !/^\d{4}$/.test(String(season))) {
    throw new TypeError("leagueShortcut und vierstellige Saison sind erforderlich.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch ist in dieser Umgebung nicht verfügbar.");

  const url = API_ROOT + "/getmatchdata/" +
    encodeURIComponent(String(leagueShortcut)) + "/" + encodeURIComponent(String(season));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetchedAtUtc = new Date(now()).toISOString();

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error("OpenLigaDB HTTP " + response.status);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("OpenLigaDB lieferte kein Match-Array.");
    }

    const matches = payload.map(match => normalizeMatch(match, {
      fetchedAtUtc,
      nowMs: now(),
      httpStatus: response.status,
      leagueShortcut,
      season
    }));

    return {
      source_id: SOURCE_ID,
      fetched_at_utc: fetchedAtUtc,
      request_url: url,
      http_status: response.status,
      received_count: matches.length,
      matches
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { fetchLeagueMatches, normalizeMatch, mapMatchStatus };
