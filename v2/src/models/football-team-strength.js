/**
 * Surebet Scanner 2.0 – leakage-safe football team strength estimator.
 * Input: completed historical fixtures from the same competition context.
 * Each fixture: {dateUtc,status,homeTeamId,awayTeamId,homeGoals,awayGoals}
 */
const ESTIMATOR_VERSION = "0.1.0";

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    /(Z|[+-]\d{2}:?\d{2})$/.test(value);
}

function estimateTeamStrengths(matches, target, options = {}) {
  if (!Array.isArray(matches)) throw new TypeError("matches must be an array.");
  if (!target || !target.homeTeamId || !target.awayTeamId || !validDate(target.kickoffUtc)) {
    throw new TypeError("Target requires homeTeamId, awayTeamId and timezone-aware kickoffUtc.");
  }
  const homeId = String(target.homeTeamId);
  const awayId = String(target.awayTeamId);
  if (homeId === awayId) throw new Error("Home and away team must differ.");

  const halfLifeDays = options.halfLifeDays ?? 180;
  const priorMatches = options.priorMatches ?? 5;
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) throw new RangeError("halfLifeDays must be positive.");
  if (!Number.isFinite(priorMatches) || priorMatches < 0) throw new RangeError("priorMatches must be non-negative.");

  const cutoff = Date.parse(target.kickoffUtc);
  const eligible = matches.filter(m =>
    m && m.status === "completed" &&
    validDate(m.dateUtc) && Date.parse(m.dateUtc) < cutoff &&
    m.homeTeamId != null && m.awayTeamId != null && String(m.homeTeamId) !== String(m.awayTeamId) &&
    Number.isInteger(m.homeGoals) && m.homeGoals >= 0 &&
    Number.isInteger(m.awayGoals) && m.awayGoals >= 0
  );
  if (!eligible.length) throw new Error("No valid completed historical matches before kickoff.");

  const decay = m => Math.pow(0.5, (cutoff - Date.parse(m.dateUtc)) / (halfLifeDays * 86400000));
  let homeGF = 0, awayGF = 0, weightTotal = 0;
  for (const m of eligible) {
    const w = decay(m);
    homeGF += m.homeGoals * w;
    awayGF += m.awayGoals * w;
    weightTotal += w;
  }
  if (weightTotal <= 0) throw new Error("No effective historical sample.");
  const leagueHomeGoals = homeGF / weightTotal;
  const leagueAwayGoals = awayGF / weightTotal;
  if (leagueHomeGoals <= 0 || leagueAwayGoals <= 0) throw new Error("League goal baseline is not positive.");

  const stats = new Map();
  function team(id) {
    if (!stats.has(id)) stats.set(id, {
      homeScored:0,homeConceded:0,homeWeight:0,
      awayScored:0,awayConceded:0,awayWeight:0
    });
    return stats.get(id);
  }
  for (const m of eligible) {
    const w = decay(m), h = team(String(m.homeTeamId)), a = team(String(m.awayTeamId));
    h.homeScored += m.homeGoals*w; h.homeConceded += m.awayGoals*w; h.homeWeight += w;
    a.awayScored += m.awayGoals*w; a.awayConceded += m.homeGoals*w; a.awayWeight += w;
  }
  function rates(s, venue) {
    const isHome = venue === "home";
    const scored = isHome ? s.homeScored : s.awayScored;
    const conceded = isHome ? s.homeConceded : s.awayConceded;
    const weight = isHome ? s.homeWeight : s.awayWeight;
    const leagueFor = isHome ? leagueHomeGoals : leagueAwayGoals;
    const leagueAgainst = isHome ? leagueAwayGoals : leagueHomeGoals;
    const attack = (scored + priorMatches * leagueFor) / ((weight + priorMatches) * leagueFor);
    const defence = (conceded + priorMatches * leagueAgainst) / ((weight + priorMatches) * leagueAgainst);
    return {attack, defence, effective_matches:weight};
  }
  const hs = stats.get(homeId), as = stats.get(awayId);
  if (!hs || !as) throw new Error("Insufficient history: one or both teams are unknown.");
  const h = rates(hs,"home"), a = rates(as,"away");
  const result = {
    estimator_version: ESTIMATOR_VERSION,
    as_of_utc: target.kickoffUtc,
    historical_match_count: eligible.length,
    leagueHomeGoals,
    leagueAwayGoals,
    homeAttack:h.attack,
    homeDefence:h.defence,
    awayAttack:a.attack,
    awayDefence:a.defence,
    sample: {
      home_team_effective_home_matches:h.effective_matches,
      away_team_effective_away_matches:a.effective_matches
    },
    source_match_cutoff_exclusive: target.kickoffUtc
  };
  return result;
}

export { estimateTeamStrengths, ESTIMATOR_VERSION };
