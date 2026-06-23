import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Match, MatchStatus, Prediction } from "@/lib/types";
import { formatBrasiliaDateTime, formatBrasiliaTime } from "@/lib/timezone";

const PREDICTION_DEADLINE_OFFSET_MS = 60 * 60 * 1000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPredictionDeadline(startsAt: string | Date) {
  return new Date(startsAt).getTime() - PREDICTION_DEADLINE_OFFSET_MS;
}

export function isPredictionLocked(startsAt: string | Date) {
  return Date.now() >= getPredictionDeadline(startsAt);
}

export function canViewMatchPredictions(
  startsAt: string | Date,
  status?: MatchStatus
) {
  return status === "finished" || isPredictionLocked(startsAt);
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function getPredictionResultMessage(
  prediction: Pick<Prediction, "predicted_home_score" | "predicted_away_score">,
  match: Pick<Match, "home_score" | "away_score">
) {
  if (match.home_score == null || match.away_score == null) {
    return null;
  }

  const exactScore =
    prediction.predicted_home_score === match.home_score &&
    prediction.predicted_away_score === match.away_score;

  if (exactScore) {
    return "Que visão de jogo!";
  }

  const actualOutcome = getOutcome(match.home_score, match.away_score);
  const predictedOutcome = getOutcome(
    prediction.predicted_home_score,
    prediction.predicted_away_score
  );

  return actualOutcome === predictedOutcome ? "Acerto, miseravi!" : null;
}

export function calculatePredictionPoints(
  prediction: Pick<Prediction, "predicted_home_score" | "predicted_away_score">,
  match: Pick<Match, "home_score" | "away_score">
) {
  if (match.home_score == null || match.away_score == null) {
    return 0;
  }

  let points = 0;
  const actualOutcome = getOutcome(match.home_score, match.away_score);
  const predictedOutcome = getOutcome(
    prediction.predicted_home_score,
    prediction.predicted_away_score
  );

  if (actualOutcome === predictedOutcome) {
    points += 10;
  }

  if (
    prediction.predicted_home_score === match.home_score &&
    prediction.predicted_away_score === match.away_score
  ) {
    points += 15;
  }

  return points;
}

export function formatKickoff(startsAt: string) {
  return formatBrasiliaTime(startsAt);
}

export function formatDateTime(startsAt: string) {
  return formatBrasiliaDateTime(startsAt);
}

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
