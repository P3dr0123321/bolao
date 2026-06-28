"use server";

import { revalidatePath } from "next/cache";
import { requireParticipant } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canViewMatchPredictions, isPredictionLocked } from "@/lib/utils";
import type {
  ActionState,
  Match,
  Prediction,
  PredictionParticipant,
  PredictionWithParticipant
} from "@/lib/types";

const defaultState: ActionState = {
  ok: false,
  message: ""
};

type PredictionRowWithParticipant = Prediction & {
  participants: PredictionParticipant | PredictionParticipant[] | null;
};

export type MatchPredictionsResult =
  | {
      ok: true;
      predictions: PredictionWithParticipant[];
    }
  | {
      ok: false;
      message: string;
      predictions?: never;
    };

function normalizeParticipantRelation(
  value: PredictionRowWithParticipant["participants"]
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function fallbackParticipant(prediction: Prediction): PredictionParticipant {
  return {
    id: prediction.participant_id,
    username: "participante-removido",
    full_name: "Participante removido",
    avatar_url: null
  };
}

function toPredictionWithParticipant(
  prediction: PredictionRowWithParticipant
): PredictionWithParticipant {
  const participant =
    normalizeParticipantRelation(prediction.participants) ??
    fallbackParticipant(prediction);

  return {
    id: prediction.id,
    participant_id: prediction.participant_id,
    match_id: prediction.match_id,
    predicted_home_score: prediction.predicted_home_score,
    predicted_away_score: prediction.predicted_away_score,
    points_awarded: prediction.points_awarded,
    created_at: prediction.created_at,
    updated_at: prediction.updated_at,
    participant
  };
}

export async function savePrediction(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  const participant = await requireParticipant();
  const supabase = createClient();
  const matchId = String(formData.get("match_id") ?? "");
  const homeScore = Number(formData.get("predicted_home_score"));
  const awayScore = Number(formData.get("predicted_away_score"));

  if (!matchId || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return { ok: false, message: "Preencha os placares com números inteiros." };
  }

  if (homeScore < 0 || awayScore < 0) {
    return { ok: false, message: "Os placares não podem ser negativos." };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return { ok: false, message: "Jogo não encontrado." };
  }

  const typedMatch = match as Match;

  if (typedMatch.status === "finished" || isPredictionLocked(typedMatch.starts_at)) {
    return {
      ok: false,
      message: "Palpite bloqueado: o prazo terminou 1 hora antes do jogo."
    };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      participant_id: participant.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "participant_id,match_id"
    }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/jogos");
  revalidatePath("/");
  return { ok: true, message: "Palpite salvo." };
}

export async function getMatchPredictions(
  matchId: string
): Promise<MatchPredictionsResult> {
  await requireParticipant();

  if (!matchId) {
    return { ok: false, message: "Jogo invÃ¡lido." };
  }

  const supabase = createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return { ok: false, message: "Jogo nÃ£o encontrado." };
  }

  const typedMatch = match as Match;

  if (!canViewMatchPredictions(typedMatch.starts_at, typedMatch.status)) {
    return {
      ok: false,
      message: "Os palpites serÃ£o liberados 1 hora antes do jogo."
    };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("predictions")
    .select(
      `
        id,
        participant_id,
        match_id,
        predicted_home_score,
        predicted_away_score,
        points_awarded,
        created_at,
        updated_at,
        participants (
          id,
          username,
          full_name,
          avatar_url
        )
      `
    )
    .eq("match_id", matchId);

  if (error) {
    return { ok: false, message: error.message };
  }

  const predictions = ((data ?? []) as unknown as PredictionRowWithParticipant[])
    .map(toPredictionWithParticipant)
    .sort((a, b) =>
      a.participant.full_name.localeCompare(b.participant.full_name, "pt-BR")
    );

  if (process.env.NODE_ENV === "development") {
    console.log("[getMatchPredictions]", matchId, predictions.length);
  }

  return { ok: true, predictions };
}
