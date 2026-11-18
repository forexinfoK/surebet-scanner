/**
 * Surebet Scanner 2.0 – integrated pre-match football prediction.
 * Combines historical team strength estimation and Poisson 1X2.
 * No odds, network, persistence or UI dependencies.
 */
import { estimateTeamStrengths } from "./football-team-strength.js";
import { predict1X2 } from "./football-poisson.js";

const PIPELINE_VERSION = "0.1.0";

function predictFootballMatch(history, target, options = {}) {
  const strengthOptions = options.strength ?? {};
  const modelOptions = options.model ?? {};
  const minHistory = options.minHistoryMatches ?? 20;
  const minTeamVenueMatches = options.minTeamVenueMatches ?? 3;

  if (!Number.isInteger(minHistory) || minHistory < 1) {
    throw new RangeError("minHistoryMatches must be a positive integer.");
  }

  const strengths = estimateTeamStrengths(history, target, strengthOptions);
  if (strengths.historical_match_count < minHistory) {
    throw new Error(
      "Insufficient history: " + strengths.historical_match_count +
      " valid matches; at least " + minHistory + " required."
    );
  }

  if (!Number.isFinite(minTeamVenueMatches) || minTeamVenueMatches < 0) {
    throw new RangeError("minTeamVenueMatches must be a non-negative number.");
  }
  if (strengths.sample.home_team_effective_home_matches < minTeamVenueMatches ||
      strengths.sample.away_team_effective_away_matches < minTeamVenueMatches) {
    throw new Error("Insufficient team-specific venue history: home=" +
      strengths.sample.home_team_effective_home_matches.toFixed(1) +
      ", away=" + strengths.sample.away_team_effective_away_matches.toFixed(1) +
      "; at least " + minTeamVenueMatches + " effective matches required.");
  }

  const prediction = predict1X2(strengths, modelOptions);
  return {
    pipeline: "football-pre-match",
    pipeline_version: PIPELINE_VERSION,
    kickoff_utc: target.kickoffUtc,
    home_team_id: target.homeTeamId,
    away_team_id: target.awayTeamId,
    data_quality: {
      historical_match_count: strengths.historical_match_count,
      minimum_history_matches: minHistory,
      minimum_team_venue_matches: minTeamVenueMatches,
      home_team_effective_home_matches: strengths.sample.home_team_effective_home_matches,
      away_team_effective_away_matches: strengths.sample.away_team_effective_away_matches
    },
    strengths,
    ...prediction
  };
}

export { predictFootballMatch, PIPELINE_VERSION };
