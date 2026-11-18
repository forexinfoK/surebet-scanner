/**
 * Surebet Scanner 2.0 – Football Poisson baseline.
 * Pure calculation module; no odds, network, storage or v1.3.0 dependencies.
 * Inputs must be pre-match, time-correct and competition-calibrated.
 */
const MODEL_NAME = "football-poisson-baseline";
const MODEL_VERSION = "0.1.0";
const MAX_GOALS = 12;

function assertFinitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(name + " must be a finite number greater than zero.");
  }
}

function poissonProbabilities(lambda, maxGoals = MAX_GOALS) {
  assertFinitePositive(lambda, "lambda");
  if (!Number.isInteger(maxGoals) || maxGoals < 6 || maxGoals > 20) {
    throw new RangeError("maxGoals must be an integer between 6 and 20.");
  }
  const probs = new Array(maxGoals + 1);
  probs[0] = Math.exp(-lambda);
  for (let k = 1; k <= maxGoals; k++) {
    probs[k] = probs[k - 1] * lambda / k;
  }
  // Keep the omitted tail in the last bucket so the distribution sums to 1.
  const sum = probs.reduce((a, b) => a + b, 0);
  probs[maxGoals] += Math.max(0, 1 - sum);
  return probs;
}

function deriveExpectedGoals(input) {
  const required = [
    "leagueHomeGoals", "leagueAwayGoals",
    "homeAttack", "homeDefence",
    "awayAttack", "awayDefence"
  ];
  for (const key of required) assertFinitePositive(input?.[key], key);

  return {
    home: input.leagueHomeGoals * input.homeAttack * input.awayDefence,
    away: input.leagueAwayGoals * input.awayAttack * input.homeDefence
  };
}

function predict1X2(input, options = {}) {
  if (!input || typeof input !== "object") throw new TypeError("Model input is required.");
  const expected = deriveExpectedGoals(input);
  const homeGoals = poissonProbabilities(expected.home, options.maxGoals ?? MAX_GOALS);
  const awayGoals = poissonProbabilities(expected.away, options.maxGoals ?? MAX_GOALS);

  let homeWin = 0, draw = 0, awayWin = 0;
  for (let h = 0; h < homeGoals.length; h++) {
    for (let a = 0; a < awayGoals.length; a++) {
      const p = homeGoals[h] * awayGoals[a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }
  const total = homeWin + draw + awayWin;
  if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid probability total.");

  const p1 = homeWin / total, px = draw / total, p2 = awayWin / total;
  return {
    model_name: MODEL_NAME,
    model_version: MODEL_VERSION,
    probabilities: {
      home_win: p1,
      draw: px,
      away_win: p2,
      double_chance_1x: p1 + px,
      double_chance_x2: px + p2,
      double_chance_12: p1 + p2
    },
    expected_goals: expected,
    method: "independent Poisson goal model",
    odds_used: false
  };
}

export {
  MODEL_NAME,
  MODEL_VERSION,
  poissonProbabilities,
  deriveExpectedGoals,
  predict1X2
};
