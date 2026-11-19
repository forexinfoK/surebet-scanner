import { writeFile } from "node:fs/promises";

const API = "https://api.openligadb.de";
const SEASON = Number(process.env.SEASON || new Date().getUTCFullYear());
if (!Number.isInteger(SEASON) || SEASON < 2000 || SEASON > 2100) throw new Error("Ungültiges Saisonstartjahr: " + SEASON);
const NOW = Date.now();
const TARGETS = [
  { name: "England – Premier League", aliases: ["Premier League"] },
  { name: "Spanien – LaLiga", aliases: ["LaLiga", "Primera Division"] },
  { name: "Deutschland – Bundesliga", aliases: ["1. deutsche bundesliga", "1. bundesliga"] },
  { name: "Italien – Serie A", aliases: ["Serie A"] },
  { name: "Frankreich – Ligue 1", aliases: ["Ligue 1"] },
  { name: "Niederlande – Eredivisie", aliases: ["Eredivisie"] },
  { name: "Portugal – Primeira Liga", aliases: ["Primeira Liga", "Liga Portugal"] },
  { name: "Österreich – Bundesliga", aliases: ["österreichische bundesliga", "admiral bundesliga"] },
  { name: "Belgien – Pro League", aliases: ["jupiler pro league", "pro league belgium"] },
  { name: "Schweiz – Super League", aliases: ["schweizer super league", "credit suisse super league"] }
];
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function resolveLeague(list, aliases) {
  const normalized = list.map(item => ({
    item,
    name: norm(item.leagueName ?? item.LeagueName),
    shortcut: String(item.leagueShortcut ?? item.LeagueShortcut ?? "")
  }));
  for (const alias of aliases.map(norm)) {
    const hits = normalized.filter(x => x.name === alias);
    if (hits.length === 1) return hits[0];
  }
  for (const alias of aliases.map(norm)) {
    const hits = normalized.filter(x => x.name.includes(alias));
    if (hits.length === 1) return hits[0];
  }
  return null;
}

const overview = await getJson(`${API}/getavailableleagues/${SEASON}`);
if (!Array.isArray(overview)) throw new Error("Ligaübersicht ist kein Array");
const jobs = TARGETS.map(target => ({ target, resolved: resolveLeague(overview, target.aliases) }));
let cursor = 0;
const results = new Array(jobs.length);
const workers = Array.from({ length: 3 }, async () => {
  while (cursor < jobs.length) {
    const index = cursor++;
    const { target, resolved } = jobs[index];
    if (!resolved) {
      results[index] = { competition: target.name, status: "NOT_RESOLVED", reason: "Keine eindeutige Namenszuordnung", match_count: 0 };
      continue;
    }
    const shortcut = resolved.shortcut;
    try {
      const matches = await getJson(`${API}/getmatchdata/${encodeURIComponent(shortcut)}/${SEASON}`);
      if (!Array.isArray(matches)) throw new Error("Spielplan ist kein Array");
      const ids = new Set();
      let structurallyValid = 0, validTimes = 0, updated = 0, duplicates = 0;
      const invalidReasons = {};
      for (const m of matches) {
        const id = m.matchID ?? m.MatchID;
        const home = m.team1 ?? m.Team1, away = m.team2 ?? m.Team2;
        const start = m.matchDateTimeUTC ?? m.MatchDateTimeUTC;
        const validStart = typeof start === "string" && Number.isFinite(Date.parse(start)) && /(Z|[+-]\d{2}:?\d{2})$/.test(start);
        if (validStart) validTimes++;
        if (id != null && ids.has(String(id))) duplicates++;
        if (id != null) ids.add(String(id));
        const checks = [
          ["missing_match_id", id != null],
          ["missing_home_team_id", home?.teamId != null],
          ["missing_away_team_id", away?.teamId != null],
          ["same_team_ids", home?.teamId != null && away?.teamId != null && String(home.teamId) !== String(away.teamId)],
          ["missing_home_team_name", typeof (home?.teamName ?? home?.TeamName) === "string" && Boolean(home?.teamName ?? home?.TeamName)],
          ["missing_away_team_name", typeof (away?.teamName ?? away?.TeamName) === "string" && Boolean(away?.teamName ?? away?.TeamName)],
          ["invalid_or_missing_timezone_start", validStart]
        ];
        const failed = checks.filter(([,ok]) => !ok).map(([reason]) => reason);
        if (failed.length === 0) structurallyValid++;
        for (const reason of failed) invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
        if (Number.isFinite(Date.parse(m.lastUpdateDateTime ?? m.LastUpdateDateTime))) updated++;
      }
      const status = matches.length > 0 && structurallyValid === matches.length && duplicates === 0 ? "STRUCTURE_OK" :
        matches.length === 0 ? "EMPTY" : "DATA_QUALITY_REVIEW";
      results[index] = {
        competition: target.name, status, league_name: resolved.item.leagueName ?? resolved.item.LeagueName ?? "",
        league_shortcut: shortcut, season: SEASON, match_count: matches.length,
        structurally_valid: structurallyValid, valid_timezone_starts: validTimes,
        source_update_timestamps: updated, duplicate_ids: duplicates, invalid_reasons: invalidReasons
      };
    } catch (error) {
      results[index] = { competition: target.name, status: "FETCH_ERROR", league_shortcut: shortcut, reason: error.message };
    }
  }
});
await Promise.all(workers);

const report = {
  generated_at_utc: new Date(NOW).toISOString(),
  season: SEASON,
  source: "OpenLigaDB public API",
  available_leagues: overview.map(item => ({ name: item.leagueName ?? item.LeagueName ?? "", shortcut: item.leagueShortcut ?? item.LeagueShortcut ?? "" })),
  activation_notice: "This report is diagnostic only. No competition is automatically enabled in the production scanner.",
  results
};
await writeFile("openligadb-coverage.json", JSON.stringify(report, null, 2) + "\n");
const rows = results.map(r => `| ${r.competition} | ${r.status} | ${r.league_shortcut || "—"} | ${r.match_count ?? "—"} | ${r.structurally_valid ?? "—"} | ${r.source_update_timestamps ?? "—"} | ${(r.reason || "").replaceAll("|", "/")} |`);
const markdown = [
  "# OpenLigaDB live coverage report", "",
  `- Generated: ${report.generated_at_utc}`,
  `- Season: ${SEASON}/${String(SEASON + 1).slice(-2)}`,
  "- Diagnostic only; does not enable competitions in the scanner.", "",
  "| Competition | Status | Shortcut | Matches | Structurally valid | With source update timestamp | Note |",
  "|---|---|---:|---:|---:|---:|---|",
  ...rows, "",
  "## Available API league names",
  "| API league name | Shortcut |",
  "|---|---|",
  ...report.available_leagues.map(item => "| " + item.name.replaceAll("|", "/") + " | " + item.shortcut + " |"), "",
  "## Structural validation detail",
  ...results.filter(r => r.invalid_reasons && Object.keys(r.invalid_reasons).length).map(r => "- " + r.competition + ": " + Object.entries(r.invalid_reasons).map(([reason,count]) => reason + "=" + count).join(", ")), ""
].join("\n");
await writeFile("openligadb-coverage.md", markdown);
console.log(markdown);
