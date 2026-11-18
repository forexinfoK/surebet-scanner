/**
 * Chronological walk-forward evaluation for the football baseline.
 * Every prediction only sees completed matches strictly before kickoff.
 * No odds are used. This is an evaluation utility, not a tip generator.
 */
import { predictFootballMatch } from "../models/football-pipeline.js";

function logLoss(probability, actual) {
  const p = Math.min(1 - 1e-15, Math.max(1e-15, probability));
  return -actual * Math.log(p) - (1 - actual) * Math.log(1 - p);
}
function brier3(probabilities, actualIndex) {
  const values = [probabilities.home_win, probabilities.draw, probabilities.away_win];
  return values.reduce((sum, p, i) => sum + (p - (i === actualIndex ? 1 : 0)) ** 2, 0);
}
function outcomeIndex(match) {
  if (match.homeGoals > match.awayGoals) return 0;
  if (match.homeGoals === match.awayGoals) return 1;
  return 2;
}
function summarize(rows) {
  if (!rows.length) return {sample_size:0,hit_rate:null,brier_score:null,log_loss:null};
  const hits = rows.filter(r => r.predicted_index === r.actual_index).length;
  return {
    sample_size: rows.length,
    hit_rate: hits / rows.length,
    brier_score: rows.reduce((s,r) => s + r.brier, 0) / rows.length,
    log_loss: rows.reduce((s,r) => s + r.log_loss, 0) / rows.length
  };
}
function runFootballWalkForward(matches, options = {}) {
  if (!Array.isArray(matches)) throw new TypeError("matches must be an array.");
  const minHistoryMatches = options.minHistoryMatches ?? 20;
  const minTeamVenueMatches = options.minTeamVenueMatches ?? 3;
  const ordered = matches.filter(m =>
    m && m.status === "completed" && typeof m.dateUtc === "string" &&
    Number.isFinite(Date.parse(m.dateUtc)) &&
    Number.isInteger(m.homeGoals) && m.homeGoals >= 0 &&
    Number.isInteger(m.awayGoals) && m.awayGoals >= 0 &&
    m.homeTeamId && m.awayTeamId && m.homeTeamId !== m.awayTeamId
  ).slice().sort((a,b) => Date.parse(a.dateUtc) - Date.parse(b.dateUtc));
  const rows = [], skipped = [];
  for (let i = 0; i < ordered.length; i++) {
    const match = ordered[i];
    const history = ordered.slice(0,i);
    if (history.length < minHistoryMatches) {
      skipped.push({event_id:match.event_id ?? null,reason:"insufficient_prior_history"});
      continue;
    }
    try {
      const result = predictFootballMatch(history, {
        homeTeamId:String(match.homeTeamId),
        awayTeamId:String(match.awayTeamId),
        kickoffUtc:new Date(match.dateUtc).toISOString()
      }, {minHistoryMatches,minTeamVenueMatches});
      const actual = outcomeIndex(match);
      const probs = result.probabilities;
      const predicted = [probs.home_win,probs.draw,probs.away_win]
        .reduce((best,p,index,arr) => p > arr[best] ? index : best,0);
      rows.push({
        event_id:match.event_id ?? null,
        dateUtc:match.dateUtc,
        predicted_index:predicted,
        actual_index:actual,
        hit:predicted===actual,
        brier:brier3(probs,actual),
        log_loss:-Math.log(Math.max(1e-15,probs[["home_win","draw","away_win"][actual]]))
      });
    } catch (error) {
      skipped.push({event_id:match.event_id ?? null,reason:error.message});
    }
  }
  return {
    method:"chronological walk-forward",
    model:"football-poisson-baseline",
    odds_used:false,
    input_matches:matches.length,
    valid_matches:ordered.length,
    evaluated:summarize(rows),
    skipped_count:skipped.length,
    skipped_reasons:skipped.reduce((acc,x)=>{acc[x.reason]=(acc[x.reason]||0)+1;return acc;},{}),
    rows
  };
}
export {runFootballWalkForward};
