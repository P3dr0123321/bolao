"use server";

import { revalidatePath } from "next/cache";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isPredictionLocked } from "@/lib/utils";
import type { ActionState, Match } from "@/lib/types";

const defaultState: ActionState = {
  ok: false,
  message: ""
};

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
  return { ok: true, message: "Palpite salvo." };
}
