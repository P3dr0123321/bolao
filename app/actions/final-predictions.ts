"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireParticipant } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { brasiliaLocalInputToUtcIso } from "@/lib/timezone";
import { isValidTeamName } from "@/lib/teams";
import type {
  ActionState,
  FinalPrediction,
  FinalPredictionSettings,
  FinalPredictionState,
  FinalPredictionWithParticipant,
  PredictionParticipant
} from "@/lib/types";

const defaultState: ActionState = {
  ok: false,
  message: ""
};

type FinalPredictionRowWithParticipant = FinalPrediction & {
  participants: PredictionParticipant | PredictionParticipant[] | null;
};

function normalizeParticipantRelation(
  value: FinalPredictionRowWithParticipant["participants"]
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function fallbackParticipant(prediction: FinalPrediction): PredictionParticipant {
  return {
    id: prediction.participant_id,
    username: "participante-removido",
    full_name: "Participante removido",
    avatar_url: null
  };
}

function toFinalPredictionWithParticipant(
  prediction: FinalPredictionRowWithParticipant
): FinalPredictionWithParticipant {
  const participant =
    normalizeParticipantRelation(prediction.participants) ??
    fallbackParticipant(prediction);

  return {
    id: prediction.id,
    participant_id: prediction.participant_id,
    finalist_one: prediction.finalist_one,
    finalist_two: prediction.finalist_two,
    winner: prediction.winner,
    created_at: prediction.created_at,
    updated_at: prediction.updated_at,
    participant
  };
}

function isPast(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return Date.now() > new Date(value).getTime();
}

function hasPassed(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return Date.now() >= new Date(value).getTime();
}

function computeState(
  settings: FinalPredictionSettings | null,
  prediction: FinalPrediction | null
): FinalPredictionState {
  const isEnabled = Boolean(settings?.is_enabled);
  const predictionDeadlinePassed = isPast(settings?.prediction_deadline_at);
  const visibilityPassed = hasPassed(settings?.visibility_at);

  return {
    settings,
    prediction,
    isEnabled,
    canSubmit:
      isEnabled &&
      Boolean(settings?.prediction_deadline_at) &&
      !predictionDeadlinePassed,
    canViewAll:
      isEnabled &&
      Boolean(settings?.visibility_at) &&
      visibilityPassed,
    predictionDeadlinePassed,
    visibilityPassed
  };
}

async function loadSettings() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("final_prediction_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FinalPredictionSettings;
}

function validateFinalPredictionInput(
  finalistOne: string,
  finalistTwo: string,
  winner: string
) {
  if (!finalistOne || !finalistTwo || !winner) {
    return "Escolhe os dois finalistas e o campeão.";
  }

  if (!isValidTeamName(finalistOne) || !isValidTeamName(finalistTwo)) {
    return "Escolhe seleções válidas para os finalistas.";
  }

  if (!isValidTeamName(winner)) {
    return "Escolhe uma seleção válida para campeã.";
  }

  if (finalistOne === finalistTwo) {
    return "Os finalistas não podem ser iguais.";
  }

  if (winner !== finalistOne && winner !== finalistTwo) {
    return "O campeão deve ser um dos dois finalistas.";
  }

  return null;
}

function parseBrasiliaDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  try {
    return brasiliaLocalInputToUtcIso(text);
  } catch {
    return "invalid";
  }
}

export async function getFinalPredictionState(): Promise<FinalPredictionState> {
  const participant = await requireParticipant();
  const supabase = createAdminClient();

  const [settingsResult, predictionResult] = await Promise.all([
    supabase
      .from("final_prediction_settings")
      .select("*")
      .eq("id", true)
      .single(),
    supabase
      .from("final_predictions")
      .select("*")
      .eq("participant_id", participant.id)
      .maybeSingle()
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  if (predictionResult.error) {
    throw new Error(predictionResult.error.message);
  }

  return computeState(
    settingsResult.data as FinalPredictionSettings,
    (predictionResult.data ?? null) as FinalPrediction | null
  );
}

export async function getFinalPredictionSettings(): Promise<FinalPredictionSettings> {
  await requireAdmin();
  return loadSettings();
}

export async function saveFinalPrediction(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  const participant = await requireParticipant();
  const finalistOne = String(formData.get("finalist_one") ?? "").trim();
  const finalistTwo = String(formData.get("finalist_two") ?? "").trim();
  const winner = String(formData.get("winner") ?? "").trim();

  const validationMessage = validateFinalPredictionInput(
    finalistOne,
    finalistTwo,
    winner
  );

  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }

  let settings: FinalPredictionSettings;

  try {
    settings = await loadSettings();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a configuração."
    };
  }

  const state = computeState(settings, null);

  if (!state.isEnabled) {
    return {
      ok: false,
      message: "O palpite da final ainda não está disponível."
    };
  }

  if (!settings.prediction_deadline_at) {
    return {
      ok: false,
      message: "O prazo do palpite da final ainda não foi configurado."
    };
  }

  if (!state.canSubmit) {
    return {
      ok: false,
      message: "O prazo para alterar o palpite da final terminou."
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("final_predictions").upsert(
    {
      participant_id: participant.id,
      finalist_one: finalistOne,
      finalist_two: finalistTwo,
      winner
    },
    {
      onConflict: "participant_id"
    }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/jogos");
  return { ok: true, message: "Palpite da final salvo." };
}

export async function getAllFinalPredictions(): Promise<
  | { ok: true; predictions: FinalPredictionWithParticipant[] }
  | { ok: false; message: string; predictions?: never }
> {
  await requireParticipant();

  let settings: FinalPredictionSettings;

  try {
    settings = await loadSettings();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a configuração."
    };
  }

  const state = computeState(settings, null);

  if (!state.isEnabled) {
    return {
      ok: false,
      message: "O palpite da final ainda não está disponível."
    };
  }

  if (!settings.visibility_at || !state.canViewAll) {
    return {
      ok: false,
      message: "Os palpites da final ainda não foram liberados."
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("final_predictions")
    .select(
      `
        id,
        participant_id,
        finalist_one,
        finalist_two,
        winner,
        created_at,
        updated_at,
        participants (
          id,
          username,
          full_name,
          avatar_url
        )
      `
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  const predictions = ((data ?? []) as unknown as FinalPredictionRowWithParticipant[])
    .map(toFinalPredictionWithParticipant)
    .sort((a, b) =>
      a.participant.full_name.localeCompare(b.participant.full_name, "pt-BR")
    );

  if (process.env.NODE_ENV === "development") {
    console.log("[getAllFinalPredictions]", predictions.length);
  }

  return { ok: true, predictions };
}

export async function updateFinalPredictionSettings(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const isEnabled = formData.get("is_enabled") === "true";
  const predictionDeadlineAt = parseBrasiliaDateTime(
    formData.get("prediction_deadline_at")
  );
  const visibilityAt = parseBrasiliaDateTime(formData.get("visibility_at"));

  if (predictionDeadlineAt === "invalid" || visibilityAt === "invalid") {
    return {
      ok: false,
      message: "Informe datas e horas válidas no Horário de Brasília."
    };
  }

  if (isEnabled && (!predictionDeadlineAt || !visibilityAt)) {
    return {
      ok: false,
      message: "Informe o prazo e a liberação para ativar o palpite da final."
    };
  }

  if (
    predictionDeadlineAt &&
    visibilityAt &&
    new Date(visibilityAt).getTime() < new Date(predictionDeadlineAt).getTime()
  ) {
    return {
      ok: false,
      message: "A liberação dos palpites deve ser igual ou posterior ao prazo."
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("final_prediction_settings")
    .upsert(
      {
        id: true,
        is_enabled: isEnabled,
        prediction_deadline_at: predictionDeadlineAt,
        visibility_at: visibilityAt
      },
      {
        onConflict: "id"
      }
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/jogos");
  revalidatePath("/admin");
  return { ok: true, message: "Configuração do palpite da final salva." };
}
