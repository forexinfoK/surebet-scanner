import test from "node:test";
import assert from "node:assert/strict";
import { poissonProbabilities, predict1X2 } from "../v2/src/models/football-poisson.js";
import { estimateTeamStrengths } from "../v2/src/models/football-team-strength.js";
import { predictFootballMatch } from "../v2/src/models/football-pipeline.js";
import { runFootballWalkForward } from "../v2/src/backtest/football-backtest.js";
import { calculateTennisElo } from "../v2/src/models/tennis-elo.js";
import { normalizeMatch, mapMatchStatus, extractRegulationTimeScore } from "../v2/src/adapters/openligadb.js";

function footballHistory(count=120) {
  const rows=[];
  const teams=["A","B","C","D","E","F"];
  for(let i=0;i<count;i++) rows.push({
    competition:"test-league",
    dateUtc:new Date(Date.UTC(2024,0,1+i*2,15)).toISOString(),
    status:"completed",
    homeTeamId:teams[i%teams.length],
    awayTeamId:teams[(i+1)%teams.length],
    homeGoals:(i*7)%4,
    awayGoals:(i*5+1)%3
  });
  return rows;
}

test("Poisson-Verteilung summiert auf eins",()=>{
  const p=poissonProbabilities(1.73);
  assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-12);
});

test("1X2 und Doppelte Chance sind konsistent",()=>{
  const p=predict1X2({leagueHomeGoals:1.5,leagueAwayGoals:1.1,homeAttack:1.1,homeDefence:.9,awayAttack:.95,awayDefence:1.05}).probabilities;
  assert.ok(Math.abs(p.home_win+p.draw+p.away_win-1)<1e-12);
  assert.ok(Math.abs(p.double_chance_1x-p.home_win-p.draw)<1e-12);
  assert.ok(Math.abs(p.double_chance_x2-p.away_win-p.draw)<1e-12);
  assert.ok(Math.abs(p.double_chance_12-p.home_win-p.away_win)<1e-12);
});

test("Teamstärke verwendet ausschließlich Spiele vor Anpfiff",()=>{
  const h=footballHistory();
  const target={homeTeamId:"A",awayTeamId:"B",kickoffUtc:"2025-01-01T12:00:00Z"};
  const a=estimateTeamStrengths(h,target);
  const b=estimateTeamStrengths([...h,{dateUtc:"2025-02-01T12:00:00Z",status:"completed",homeTeamId:"A",awayTeamId:"B",homeGoals:99,awayGoals:0}],target);
  assert.equal(a.historical_match_count,b.historical_match_count);
  assert.equal(a.homeAttack,b.homeAttack);
});

test("Fußballpipeline lehnt zu kleine Stichprobe ab",()=>{
  assert.throws(()=>predictFootballMatch(footballHistory(12),{homeTeamId:"A",awayTeamId:"B",kickoffUtc:"2025-01-01T12:00:00Z"},{minHistoryMatches:20}));
});

test("Walk-forward-Backtest liefert nur frühere Historie und Kennzahlen",()=>{
  const r=runFootballWalkForward(footballHistory(120),{minHistoryMatches:20,minTeamVenueMatches:1});
  assert.ok(r.valid_matches>0);
  assert.ok(r.evaluated.sample_size>0);
  assert.ok(r.evaluated.brier_score>=0);
  assert.equal(r.odds_used,false);
});

test("Tennis-Elo trennt ATP und WTA",()=>{
  const rows=[];
  for(let i=0;i<80;i++) rows.push({
    dateUtc:new Date(Date.UTC(2024,0,1+i,12)).toISOString(),
    status:"completed",tour:i%2?"WTA":"ATP",
    winnerId:["A","B","C","D"][i%4],loserId:["A","B","C","D"][(i+1)%4],
    surface:i%3?"hard":"clay"
  });
  const target={tour:"ATP",playerAId:"A",playerBId:"B",startUtc:"2025-01-01T12:00:00Z"};
  const a=calculateTennisElo(rows,target);
  const b=calculateTennisElo([...rows,...rows.filter(x=>x.tour==="WTA").map(x=>({...x,winnerId:"A",loserId:"B"}))],target);
  assert.equal(a.ratings.overall_a,b.ratings.overall_a);
  assert.equal(a.data_quality.historical_matches,b.data_quality.historical_matches);
});

test("OpenLigaDB: zukünftiges Match mit MatchIsFinished=false ist scheduled",()=>{
  const match={matchIsFinished:false,matchDateTimeUTC:"2026-12-01T18:00:00Z"};
  assert.equal(mapMatchStatus(match,Date.parse("2026-11-18T12:00:00Z")),"scheduled");
});

test("OpenLigaDB: nicht beendetes Match mit vergangenem Anpfiff bleibt unknown",()=>{
  const match={matchIsFinished:false,matchDateTimeUTC:"2026-11-18T10:00:00Z"};
  assert.equal(mapMatchStatus(match,Date.parse("2026-11-18T12:00:00Z")),"unknown");
});

test("OpenLigaDB: regulation time score is preferred and normalized",()=>{
  const score=extractRegulationTimeScore({matchResults:[
    {resultTypeKind:"After90Minutes",pointsTeam1:2,pointsTeam2:1},
    {resultTypeKind:"AfterExtraTime",pointsTeam1:3,pointsTeam2:1}
  ]});
  assert.deepEqual(score,{homeGoals:2,awayGoals:1});
});

test("OpenLigaDB: missing source update timestamp is visible as quality reason",()=>{
  const row=normalizeMatch({
    matchID:123,matchIsFinished:true,matchDateTimeUTC:"2026-10-01T18:00:00Z",
    team1:{teamId:1,teamName:"Home"},team2:{teamId:2,teamName:"Away"},
    matchResults:[{resultTypeKind:"After90Minutes",pointsTeam1:1,pointsTeam2:0}]
  },{nowMs:Date.parse("2026-11-18T12:00:00Z"),fetchedAtUtc:"2026-11-18T12:00:00Z"});
  assert.equal(row.status,"completed");
  assert.equal(row.homeGoals,1);
  assert.ok(row.data_quality.reasons.includes("SOURCE_TIMESTAMP_MISSING"));
});

test("Tennis-Elo ignoriert Resultate nach dem Prognosezeitpunkt",()=>{
  const history=[];
  for(let i=0;i<30;i++) history.push({
    dateUtc:new Date(Date.UTC(2024,0,1+i,12)).toISOString(),
    status:"completed",tour:"ATP",winnerId:i%2?"A":"B",loserId:i%2?"B":"A",surface:"hard"
  });
  const target={tour:"ATP",playerAId:"A",playerBId:"B",startUtc:"2025-01-01T12:00:00Z"};
  const baseline=calculateTennisElo(history,target);
  const withFuture=calculateTennisElo([...history,{
    dateUtc:"2025-02-01T12:00:00Z",status:"completed",tour:"ATP",
    winnerId:"A",loserId:"B",surface:"hard"
  }],target);
  assert.deepEqual(withFuture.ratings,baseline.ratings);
  assert.equal(withFuture.data_quality.historical_matches,baseline.data_quality.historical_matches);
});

test("PWA-Manifest enthält mobile Installationsmetadaten",async()=>{
  const {readFile}=await import("node:fs/promises");
  const manifest=JSON.parse(await readFile(new URL("../v2/manifest.webmanifest",import.meta.url),"utf8"));
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.lang,"de-AT");
  assert.ok(manifest.icons.length>0);
  assert.ok(manifest.start_url);
});

test("Service Worker cached V2 Shell, aber keine fremden API-Requests",async()=>{
  const {readFile}=await import("node:fs/promises");
  const sw=await readFile(new URL("../v2/sw.js",import.meta.url),"utf8");
  assert.match(sw,/surebet-v2-shell/);
  assert.match(sw,/url\.origin !== self\.location\.origin/);
  assert.match(sw,/self\.clients\.claim/);
});

test("Team-IDs als Zahl und Text werden identisch behandelt",()=>{
  const rows=footballHistory(60).map(m=>({...m,homeTeamId:Number(m.homeTeamId.charCodeAt(0)),awayTeamId:Number(m.awayTeamId.charCodeAt(0))}));
  const target={homeTeamId:"65",awayTeamId:66,kickoffUtc:"2025-01-01T12:00:00Z"};
  const result=estimateTeamStrengths(rows,target);
  assert.ok(Number.isFinite(result.homeAttack));
  assert.ok(Number.isFinite(result.awayAttack));
  assert.throws(()=>estimateTeamStrengths(rows,{...target,awayTeamId:"65"}),/must differ/);
});

test("Walk-forward verwirft identische Team-IDs auch bei Zahl/Text-Mischung",()=>{
  const rows=footballHistory(80).map(m=>({...m,homeTeamId:Number(m.homeTeamId.charCodeAt(0)),awayTeamId:m.awayTeamId}));
  rows.push({
    competition:"test-league",dateUtc:"2025-01-01T12:00:00Z",status:"completed",
    homeTeamId:65,awayTeamId:"65",homeGoals:4,awayGoals:0
  });
  const result=runFootballWalkForward(rows,{minHistoryMatches:20,minTeamVenueMatches:1});
  assert.equal(result.valid_matches,80);
  assert.equal(result.skipped_count+result.evaluated.sample_size,80);
});
