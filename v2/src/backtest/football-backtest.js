/**
 * Chronological, competition-isolated walk-forward evaluation.
 * Only completed matches in the same competition and strictly before kickoff
 * may enter a prediction's history. Odds are never used.
 */
import { predictFootballMatch } from "../models/football-pipeline.js";

function outcomeIndex(match) {
  return match.homeGoals > match.awayGoals ? 0 : match.homeGoals === match.awayGoals ? 1 : 2;
}

function metrics(rows) {
  const n = rows.length;
  return {
    sample_size: n,
    hit_rate: n ? rows.filter(row => row.hit).length / n : null,
    brier_score: n ? rows.reduce((sum,row) => sum + row.brier,0) / n : null,
    log_loss: n ? rows.reduce((sum,row) => sum + row.log_loss,0) / n : null
  };
}

function runFootballWalkForward(matches, options = {}) {
  if (!Array.isArray(matches)) throw new TypeError("matches must be an array.");
  const minHistoryMatches = options.minHistoryMatches ?? 20;
  const minTeamVenueMatches = options.minTeamVenueMatches ?? 3;
  const pickThreshold = options.pickThreshold ?? 0.65;
  if (!Number.isFinite(pickThreshold) || pickThreshold <= 0 || pickThreshold > 1) {
    throw new RangeError("pickThreshold must be in (0,1].");
  }

  const valid = matches.filter(match =>
    match && match.status === "completed" &&
    typeof match.dateUtc === "string" &&
    Number.isFinite(Date.parse(match.dateUtc)) &&
    /(Z|[+-]\d{2}:?\d{2})$/.test(match.dateUtc) &&
    Number.isInteger(match.homeGoals) && match.homeGoals >= 0 &&
    Number.isInteger(match.awayGoals) && match.awayGoals >= 0 &&
    match.homeTeamId != null && match.awayTeamId != null &&
    String(match.homeTeamId).trim() !== "" &&
    String(match.awayTeamId).trim() !== "" &&
    String(match.homeTeamId) !== String(match.awayTeamId) &&
    typeof (match.competition ?? "default") === "string"
  );

  const groups = new Map();
  for (const match of valid) {
    const competition = match.competition ?? "default";
    if (!groups.has(competition)) groups.set(competition, []);
    groups.get(competition).push(match);
  }

  const rows = [], skipped = [];
  for (const [competition, group] of groups) {
    group.sort((a,b) => Date.parse(a.dateUtc) - Date.parse(b.dateUtc));
    for (const match of group) {
      const kickoff = Date.parse(match.dateUtc);
      // Strictly earlier kickoff prevents same-time and same-day fixtures
      // from leaking into one another when source times are unavailable.
      const history = group.filter(item => Date.parse(item.dateUtc) < kickoff);
      if (history.length < minHistoryMatches) {
        skipped.push({event_id:match.event_id ?? null,competition,reason:"insufficient_prior_history"});
        continue;
      }
      try {
        const priorCounts = [1,1,1];
        for (const prior of history) priorCounts[outcomeIndex(prior)]++;
        const priorTotal = priorCounts.reduce((sum,value)=>sum+value,0);
        const referenceProbabilities = priorCounts.map(value=>value/priorTotal);
        const result = predictFootballMatch(history, {
          homeTeamId:String(match.homeTeamId),
          awayTeamId:String(match.awayTeamId),
          kickoffUtc:new Date(kickoff).toISOString()
        }, {minHistoryMatches,minTeamVenueMatches});
        const probabilities = result.probabilities;
        const actual = outcomeIndex(match);
        const values = [probabilities.home_win,probabilities.draw,probabilities.away_win];
        if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1) ||
            Math.abs(values.reduce((sum,value) => sum + value,0) - 1) > 1e-8) {
          throw Error("Model probabilities are invalid or do not sum to 1.");
        }
        const predicted = values.reduce((best,value,index) => value > values[best] ? index : best,0);
        rows.push({
          event_id:match.event_id ?? null,
          competition,
          dateUtc:match.dateUtc,
          hit:predicted === actual,
          max_probability:Math.max(...values),
          actual_probability:values[actual],
          probabilities:values,
          brier:values.reduce((sum,value,index) => sum + (value - (index === actual ? 1 : 0)) ** 2,0),
          log_loss:-Math.log(Math.max(1e-15,values[actual])),
          reference_hit:referenceProbabilities.indexOf(Math.max(...referenceProbabilities)) === actual,
          reference_probabilities:referenceProbabilities,
          reference_brier:referenceProbabilities.reduce((sum,value,index)=>sum+(value-(index===actual?1:0))**2,0),
          reference_log_loss:-Math.log(Math.max(1e-15,referenceProbabilities[actual]))
        });
      } catch (error) {
        skipped.push({event_id:match.event_id ?? null,competition,reason:error.message});
      }
    }
  }

  rows.sort((a,b) => Date.parse(a.dateUtc) - Date.parse(b.dateUtc));
  const qualified = rows.filter(row => row.max_probability >= pickThreshold);
  const referenceRows = rows.map(row=>({hit:row.reference_hit,brier:row.reference_brier,log_loss:row.reference_log_loss}));
  const referenceQualified = rows.filter(row=>Math.max(...row.reference_probabilities)>=pickThreshold);
  const byCompetition = {};
  for (const competition of groups.keys()) {
    const subset = rows.filter(row => row.competition === competition);
    const qualifiedSubset = subset.filter(row => row.max_probability >= pickThreshold);
    byCompetition[competition] = {
      ...metrics(subset),
      reference:metrics(subset.map(row=>({hit:row.reference_hit,brier:row.reference_brier,log_loss:row.reference_log_loss}))),
      qualified_picks: {
        threshold:pickThreshold,
        ...metrics(qualifiedSubset),
        coverage:subset.length ? qualifiedSubset.length / subset.length : null
      },
      reference_qualified_picks: (() => {
        const ref = subset.filter(row=>Math.max(...row.reference_probabilities)>=pickThreshold);
        return {...metrics(ref.map(row=>({hit:row.reference_hit,brier:row.reference_brier,log_loss:row.reference_log_loss}))),coverage:subset.length ? ref.length/subset.length : null};
      })()
    };
  }

  return {
    method:"chronological competition-isolated walk-forward",
    model:"football-poisson-baseline",
    odds_used:false,
    input_matches:matches.length,
    valid_matches:valid.length,
    evaluated:metrics(rows),
    reference:metrics(referenceRows),
    qualified_picks:{
      threshold:pickThreshold,
      ...metrics(qualified),
      coverage:rows.length ? qualified.length / rows.length : null
    },
    reference_qualified_picks:{threshold:pickThreshold,...metrics(referenceQualified.map(row=>({hit:row.reference_hit,brier:row.reference_brier,log_loss:row.reference_log_loss}))),coverage:rows.length ? referenceQualified.length/rows.length : null},
    by_competition:byCompetition,
    skipped_count:skipped.length,
    skipped_reasons:skipped.reduce((counts,item) => {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    },{}),
    skipped_details:skipped,
    rows
  };
}

export { runFootballWalkForward };
