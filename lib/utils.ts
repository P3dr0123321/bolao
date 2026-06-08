import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Match, Prediction } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isPredictionLocked(startsAt: string | Date) {
  const kickoff = new Date(startsAt).getTime();
  const lockTime = kickoff - 60 * 60 * 1000;
  return Date.now() >= lockTime;
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
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
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(startsAt));
}

export function formatDateTime(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(startsAt));
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
