import { writeFile } from "node:fs/promises";
import { runFootballWalkForward } from "../v2/src/backtest/football-backtest.js";

const SEASONS = ["2024-25", "2025-26"];
const COMPETITIONS = [
  { id:"eng-prem", name:"England Premier League", minimumSeasonMatches:350, urls: s => `https://raw.githubusercontent.com/openfootball/england/master/${s}/1-premierleague${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"esp-laliga", name:"Spain LaLiga", minimumSeasonMatches:350, urls: s => `https://raw.githubusercontent.com/openfootball/espana/master/${s}/1-liga${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"ger-bundesliga", name:"Germany Bundesliga", minimumSeasonMatches:280, urls: s => `https://raw.githubusercontent.com/openfootball/deutschland/master/${s}/1-bundesliga${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"ita-serie-a", name:"Italy Serie A", minimumSeasonMatches:350, urls: s => `https://raw.githubusercontent.com/openfootball/italy/master/${s}/1-seriea${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"fra-ligue-1", name:"France Ligue 1", minimumSeasonMatches:280, urls: s => `https://raw.githubusercontent.com/openfootball/europe/master/france/${s}_fr1${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"ned-eredivisie", name:"Netherlands Eredivisie", minimumSeasonMatches:280, urls: s => `https://raw.githubusercontent.com/openfootball/europe/master/netherlands/${s}_nl1.txt` },
  { id:"por-primeira", name:"Portugal Primeira Liga", minimumSeasonMatches:280, urls: s => `https://raw.githubusercontent.com/openfootball/europe/master/portugal/${s}_pt1.txt` },
  { id:"aut-bundesliga", name:"Austria Bundesliga", minimumSeasonMatches:180, urls: s => `https://raw.githubusercontent.com/openfootball/austria/master/${s}/1-bundesliga${s === "2025-26" ? "-full" : ""}.txt` },
  { id:"bel-pro-league", name:"Belgium Pro League", minimumSeasonMatches:250, urls: s => `https://raw.githubusercontent.com/openfootball/belgium/master/${s}/be1.txt` },
  { id:"sui-super-league", name:"Switzerland Super League", minimumSeasonMatches:200, urls: s => `https://raw.githubusercontent.com/openfootball/europe/master/switzerland/${s}_ch1.txt` }
];

const MONTHS = new Map(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i)=>[m,i]));
const DATE_LINE = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) (\d{1,2})(?: (\d{4}))?(?:\s+.*)?$/;
const MATCH_LINE = /^\s+(\d{1,2}:\d{2})\s+(.+?)\s+(\d+)\s*[-–:]\s*(\d+)(?:\s+\(\d+\s*[-–:]\s*\d+\))?\s+(.+?)\s*$/;
const MATCH_V_LINE = /^\s*(?:\d{1,2}:\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)\s*[-–:]\s*(\d+)(?:\s+\(\d+\s*[-–:]\s*\d+\))?\s*$/i;

function teamKey(name) {
  return String(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
}

function parseFootballTxt(source, competition, season) {
  const startYear = Number(season.slice(0,4));
  const rows = [];
  let currentDate = null;
  let lastMonth = null;
  for (const line of String(source).split(/\r?\n/)) {
    const trimmed = line.trim();
    const dateMatch = trimmed.match(DATE_LINE);
    if (dateMatch) {
      const month = MONTHS.get(dateMatch[1]);
      const day = Number(dateMatch[2]);
      let year = dateMatch[3] ? Number(dateMatch[3]) : (month >= 6 ? startYear : startYear + 1);
      if (!dateMatch[3] && lastMonth != null && lastMonth >= 9 && month <= 2) year = startYear + 1;
      currentDate = {year,month,day};
      lastMonth = month;
      continue;
    }
    if (!currentDate) continue;
    const versus = line.match(MATCH_V_LINE);
    const standard = versus ? null : line.match(MATCH_LINE);
    if (!standard && !versus) continue;
    const home = standard ? standard[2].trim() : versus[1].trim();
    const away = standard ? standard[5].trim() : versus[2].trim();
    const homeGoals = Number(standard ? standard[3] : versus[3]);
    const awayGoals = Number(standard ? standard[4] : versus[4]);
    if (!home || !away || teamKey(home) === teamKey(away) ||
        !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) continue;
    // OpenFootball supplies local kickoff clocks without a timezone. For a
    // leakage-safe historical backtest, all same-day fixtures share one
    // neutral timestamp, so none can leak into another same-day prediction.
    const dateUtc = new Date(Date.UTC(currentDate.year,currentDate.month,currentDate.day,12)).toISOString();
    rows.push({
      event_id: competition.id+":"+season+":"+dateUtc+":"+teamKey(home)+":"+teamKey(away),
      competition: competition.id,
      dateUtc,
      status:"completed",
      homeTeamId:teamKey(home),
      awayTeamId:teamKey(away),
      homeGoals,
      awayGoals
    });
  }
  return rows;
}

async function download(url) {
  const response = await fetch(url, {headers:{"User-Agent":"SurebetScanner-V2-Research/1.0","Accept":"text/plain"}});
  if (!response.ok) throw new Error("HTTP "+response.status);
  return response.text();
}

async function main() {
  const reports = [];
  const allMatches = [];
  for (const competition of COMPETITIONS) {
    let loaded = 0, errors = [];
    for (const season of SEASONS) {
      const url = competition.urls(season);
      try {
        const source = await download(url);
        const matches = parseFootballTxt(source,competition,season);
        if (matches.length && matches.length >= competition.minimumSeasonMatches) {
          allMatches.push(...matches);
          loaded += matches.length;
          reports.push({competition:competition.name,competition_id:competition.id,season,status:"LOADED",matches:matches.length,minimum_required:competition.minimumSeasonMatches,source:url});
        } else if (matches.length) {
          reports.push({competition:competition.name,competition_id:competition.id,season,status:"LOW_COVERAGE_EXCLUDED",matches:matches.length,minimum_required:competition.minimumSeasonMatches,source:url});
        } else reports.push({competition:competition.name,competition_id:competition.id,season,status:"EMPTY_OR_UNPARSED",matches:0,minimum_required:competition.minimumSeasonMatches,source:url});
      } catch (error) {
        errors.push(season+": "+error.message);
        reports.push({competition:competition.name,competition_id:competition.id,season,status:"UNAVAILABLE",matches:0,source:url,error:error.message});
      }
    }
    if (!loaded) reports.push({competition:competition.name,competition_id:competition.id,status:"NO_HISTORICAL_DATA",note:errors.join("; ")});
  }
  const backtest = runFootballWalkForward(allMatches,{minHistoryMatches:20,minTeamVenueMatches:3});
  const result = {
    generated_at_utc:new Date().toISOString(),
    source:"OpenFootball public-domain football.txt datasets (CC0-1.0)",
    source_notice:"Diagnostic historical dataset only. Coverage and team-name continuity are checked per file; no odds are used.",
    seasons:SEASONS,
    competition_files:reports,
    input_match_count:allMatches.length,
    backtest
  };
  await writeFile("openfootball-backtest.json",JSON.stringify(result,null,2)+"\n");
  const summary = Object.entries(backtest.by_competition).map(([id,v]) =>
    `| ${id} | ${v.sample_size} | ${v.hit_rate==null?"—":(v.hit_rate*100).toFixed(1)+" %"} | ${v.brier_score==null?"—":v.brier_score.toFixed(4)} | ${v.log_loss==null?"—":v.log_loss.toFixed(4)} | ${v.qualified_picks.sample_size} | ${v.qualified_picks.hit_rate==null?"—":(v.qualified_picks.hit_rate*100).toFixed(1)+" %"} |`);
  const skippedByCompetition = {};
  for (const item of backtest.skipped_details || []) {
    skippedByCompetition[item.competition] ||= {};
    skippedByCompetition[item.competition][item.reason] = (skippedByCompetition[item.competition][item.reason] || 0) + 1;
  }
  const skippedRows = Object.entries(skippedByCompetition).map(([competition,reasons]) =>
    `| ${competition} | ${Object.entries(reasons).map(([reason,count])=>reason+": "+count).join("; ")} |`);
  const fileRows = reports.map(r=>`| ${r.competition} | ${r.season||"—"} | ${r.status} | ${r.matches} | ${(r.error||"").replaceAll("|","/")} |`);
  const markdown = [
    "# OpenFootball historical backtest",
    "",
    `Generated: ${result.generated_at_utc}`,
    `Input matches: ${allMatches.length}`,
    "Odds used: no",
    "Important: Same-day matches are assigned one neutral timestamp to prevent same-day leakage; the sample is diagnostic, not proof of future profitability.",
    "",
    "## Source coverage",
    "| Competition | Season | Status | Parsed matches | Note |",
    "|---|---|---|---:|---|",
    ...fileRows,
    "",
    "## Walk-forward metrics",
    "| Competition ID | Evaluated matches | Hit rate | Brier score | Log loss | ≥65% picks | Pick hit rate |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...summary,
    "",
    "",
    "## Model comparison on identical evaluated matches",
    "| Forecast | Matches | Hit rate | Brier score | Log loss |",
    "|---|---:|---:|---:|---:|",
    `| Poisson team model | ${backtest.evaluated.sample_size} | ${backtest.evaluated.hit_rate==null?"—":(backtest.evaluated.hit_rate*100).toFixed(1)+" %"} | ${backtest.evaluated.brier_score==null?"—":backtest.evaluated.brier_score.toFixed(4)} | ${backtest.evaluated.log_loss==null?"—":backtest.evaluated.log_loss.toFixed(4)} |`,
    `| Smoothed league 1X2 prior | ${backtest.reference.sample_size} | ${backtest.reference.hit_rate==null?"—":(backtest.reference.hit_rate*100).toFixed(1)+" %"} | ${backtest.reference.brier_score==null?"—":backtest.reference.brier_score.toFixed(4)} | ${backtest.reference.log_loss==null?"—":backtest.reference.log_loss.toFixed(4)} |`,
    `| ≥65% Poisson picks | ${backtest.qualified_picks.sample_size} | ${backtest.qualified_picks.hit_rate==null?"—":(backtest.qualified_picks.hit_rate*100).toFixed(1)+" %"} | ${backtest.qualified_picks.brier_score==null?"—":backtest.qualified_picks.brier_score.toFixed(4)} | ${backtest.qualified_picks.log_loss==null?"—":backtest.qualified_picks.log_loss.toFixed(4)} |`,
    `| ≥65% league-prior picks | ${backtest.reference_qualified_picks.sample_size} | ${backtest.reference_qualified_picks.hit_rate==null?"—":(backtest.reference_qualified_picks.hit_rate*100).toFixed(1)+" %"} | ${backtest.reference_qualified_picks.brier_score==null?"—":backtest.reference_qualified_picks.brier_score.toFixed(4)} | ${backtest.reference_qualified_picks.log_loss==null?"—":backtest.reference_qualified_picks.log_loss.toFixed(4)} |`,
    "Note: Both forecasts are scored on the same matches where the Poisson model produced a valid prediction. The league prior uses only earlier results in that competition, with Laplace smoothing.",
    "",
    "## All qualified picks (max 1X2 probability ≥65%)",
    `Sample: ${backtest.qualified_picks.sample_size}; coverage: ${backtest.qualified_picks.coverage==null?"—":(backtest.qualified_picks.coverage*100).toFixed(1)+" %"}; hit rate: ${backtest.qualified_picks.hit_rate==null?"—":(backtest.qualified_picks.hit_rate*100).toFixed(1)+" %"}; Brier: ${backtest.qualified_picks.brier_score==null?"—":backtest.qualified_picks.brier_score.toFixed(4)}; Log loss: ${backtest.qualified_picks.log_loss==null?"—":backtest.qualified_picks.log_loss.toFixed(4)}`,
    "",
    "## Skipped match reasons",
    "| Competition ID | Reasons |",
    "|---|---|",
    ...skippedRows,
    "",
    `Total evaluated: ${backtest.evaluated.sample_size}; skipped: ${backtest.skipped_count}`,
    ""
  ].join("\n");
  await writeFile("openfootball-backtest.md",markdown);
  console.log(markdown);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error=>{console.error(error);process.exitCode=1;});

export { parseFootballTxt, teamKey, COMPETITIONS };
