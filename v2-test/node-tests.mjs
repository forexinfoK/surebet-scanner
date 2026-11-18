import test from "node:test";
import assert from "node:assert/strict";
import { poissonProbabilities, predict1X2 } from "../v2/src/models/football-poisson.js";
import { estimateTeamStrengths } from "../v2/src/models/football-team-strength.js";
import { predictFootballMatch } from "../v2/src/models/football-pipeline.js";
import { runFootballWalkForward } from "../v2/src/backtest/football-backtest.js";
import { calculateTennisElo } from "../v2/src/models/tennis-elo.js";

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
