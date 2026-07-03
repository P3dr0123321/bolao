"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { recalculateLeaderboard } from "@/lib/leaderboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTeamName } from "@/lib/teams";
import { brasiliaLocalInputToUtcIso } from "@/lib/timezone";
import type {
  ActionState,
  Match,
  MatchStatus,
  Participant
} from "@/lib/types";
import { usernameToEmail } from "@/lib/auth-utils";
import { calculatePredictionPoints } from "@/lib/utils";

const defaultState: ActionState = {
  ok: false,
  message: ""
};

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function safeStorageName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadPublicFile(bucket: string, file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  const supabase = createAdminClient();
  const path = `${randomUUID()}-${safeStorageName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream"
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function revalidateParticipantPages() {
  revalidatePath("/");
  revalidatePath("/jogos");
  revalidatePath("/admin");
}

function revalidateMatchPages() {
  revalidatePath("/");
  revalidatePath("/jogos");
  revalidatePath("/admin");
}

function optionalScore(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  const score = Number(text);
  return {
    valid: Number.isInteger(score) && score >= 0,
    value: score
  };
}

function isValidScore(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function parseBrasiliaStartsAt(value: string) {
  try {
    return brasiliaLocalInputToUtcIso(value);
  } catch {
    return null;
  }
}

async function scorePredictionsForMatch(
  supabase: ReturnType<typeof createAdminClient>,
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ scoredCount: number; errors: string[] }> {
  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      `
        id,
        participant_id,
        match_id,
        predicted_home_score,
        predicted_away_score
      `
    )
    .eq("match_id", matchId);

  if (predictionsError) {
    return { scoredCount: 0, errors: [predictionsError.message] };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[scorePredictionsForMatch]", {
      matchId,
      predictionsFound: predictions?.length ?? 0
    });
  }

  let scoredCount = 0;
  const errors: string[] = [];

  for (const prediction of predictions ?? []) {
    const points = calculatePredictionPoints(
      prediction.predicted_home_score,
      prediction.predicted_away_score,
      homeScore,
      awayScore
    );

    const { error: updateError } = await supabase
      .from("predictions")
      .update({ points_awarded: points })
      .eq("id", prediction.id);

    if (updateError) {
      errors.push(`${prediction.id}: ${updateError.message}`);
    } else {
      scoredCount += 1;
    }
  }

  return { scoredCount, errors };
}

async function clearPredictionPointsForMatch(
  supabase: ReturnType<typeof createAdminClient>,
  matchId: string
) {
  const { error } = await supabase
    .from("predictions")
    .update({ points_awarded: 0 })
    .eq("match_id", matchId);

  if (error) {
    throw new Error(error.message);
  }
}

async function recalculateLeaderboardOrThrow(
  supabase: ReturnType<typeof createAdminClient>
) {
  const result = await recalculateLeaderboard(supabase);

  if (!result.ok) {
    throw new Error(
      result.errors[0] ?? "Nao foi possivel recalcular a tabela."
    );
  }

  return result;
}

async function recalculateMatchPoints(
  supabase: ReturnType<typeof createAdminClient>,
  match: Match
): Promise<{ scoredCount: number; errors: string[] }> {
  if (match.status !== "finished") {
    await clearPredictionPointsForMatch(supabase, match.id);
    await recalculateLeaderboardOrThrow(supabase);
    return { scoredCount: 0, errors: [] };
  }

  if (!isValidScore(match.home_score) || !isValidScore(match.away_score)) {
    throw new Error("Placar final invalido para pontuacao.");
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[finishMatch] match updated", {
      matchId: match.id,
      homeScore: match.home_score,
      awayScore: match.away_score
    });
  }

  const scoreResult = await scorePredictionsForMatch(
    supabase,
    match.id,
    match.home_score,
    match.away_score
  );

  if (scoreResult.errors.length > 0) {
    throw new Error(scoreResult.errors[0]);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[finishMatch] predictions scored", {
      matchId: match.id,
      scoredCount: scoreResult.scoredCount
    });
  }

  const leaderboardResult = await recalculateLeaderboardOrThrow(supabase);

  if (process.env.NODE_ENV === "development") {
    console.log("[finishMatch] leaderboard recalculated", {
      participantsUpdated: leaderboardResult.participantsUpdated,
      predictionsCount: leaderboardResult.predictionsCount
    });
  }

  return scoreResult;
}

export async function createParticipant(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "participant");
  const avatar = formData.get("avatar") as File | null;

  if (!username || !password || !fullName) {
    return { ok: false, message: "Usuário, senha e nome completo são obrigatórios." };
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { ok: false, message: "Use apenas letras, números, ponto, hífen ou underline." };
  }

  if (role !== "participant" && role !== "admin") {
    return { ok: false, message: "Perfil inválido." };
  }

  const { data: userData, error: authError } =
    await supabase.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName
      }
    });

  if (authError || !userData.user) {
    return { ok: false, message: authError?.message ?? "Não foi possível criar o login." };
  }

  try {
    const avatarUrl = await uploadPublicFile("avatars", avatar);
    const { error } = await supabase.from("participants").insert({
      auth_user_id: userData.user.id,
      username,
      full_name: fullName,
      role,
      avatar_url: avatarUrl
    });

    if (error) {
      await supabase.auth.admin.deleteUser(userData.user.id);
      return { ok: false, message: error.message };
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(userData.user.id);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao enviar avatar."
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Participante criado." };
}

export async function updateParticipant(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const participantId = String(formData.get("participant_id") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  const avatar = formData.get("avatar") as File | null;

  if (!participantId) {
    return { ok: false, message: "Participante inválido." };
  }

  if (!username || !fullName) {
    return { ok: false, message: "Usuário e nome completo são obrigatórios." };
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      message: "Use apenas letras, números, ponto, hífen ou underline."
    };
  }

  if (role !== "participant" && role !== "admin") {
    return { ok: false, message: "Perfil inválido." };
  }

  if (password && password.length < 6) {
    return { ok: false, message: "A nova senha deve ter pelo menos 6 caracteres." };
  }

  const { data: existingData, error: existingError } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (existingError || !existingData) {
    return { ok: false, message: "Participante não encontrado." };
  }

  const existing = existingData as Participant;

  if (existing.username !== username) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("participants")
      .select("id")
      .eq("username", username)
      .neq("id", participantId)
      .maybeSingle();

    if (duplicateError) {
      return { ok: false, message: duplicateError.message };
    }

    if (duplicate) {
      return { ok: false, message: "Este nome de usuário já está em uso." };
    }
  }

  if (existing.role === "admin" && role !== "admin") {
    const { count, error: countError } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return { ok: false, message: countError.message };
    }

    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Não é possível remover o último administrador." };
    }
  }

  if (!existing.auth_user_id && password) {
    return {
      ok: false,
      message: "Este participante não possui uma conta de login vinculada."
    };
  }

  try {
    const avatarUrl = await uploadPublicFile("avatars", avatar);

    if (existing.auth_user_id) {
      const authUpdates: {
        email?: string;
        password?: string;
        user_metadata: { username: string; full_name: string };
      } = {
        user_metadata: {
          username,
          full_name: fullName
        }
      };

      if (existing.username !== username) {
        authUpdates.email = usernameToEmail(username);
      }

      if (password) {
        authUpdates.password = password;
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(
        existing.auth_user_id,
        authUpdates
      );

      if (authError) {
        return { ok: false, message: authError.message };
      }
    }

    const participantUpdates: {
      username: string;
      full_name: string;
      role: string;
      avatar_url?: string;
    } = {
      username,
      full_name: fullName,
      role
    };

    if (avatarUrl) {
      participantUpdates.avatar_url = avatarUrl;
    }

    const { error: updateError } = await supabase
      .from("participants")
      .update(participantUpdates)
      .eq("id", participantId);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível atualizar o participante."
    };
  }

  revalidateParticipantPages();
  return { ok: true, message: "Participante atualizado." };
}

export async function deleteParticipant(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  const currentAdmin = await requireAdmin();
  const supabase = createAdminClient();
  const participantId = String(formData.get("participant_id") ?? "");

  if (!participantId) {
    return { ok: false, message: "Participante inválido." };
  }

  const { data: participantData, error: participantError } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (participantError || !participantData) {
    return { ok: false, message: "Participante não encontrado." };
  }

  const participant = participantData as Participant;

  if (participant.id === currentAdmin.id) {
    return {
      ok: false,
      message: "Você não pode excluir a sua própria conta enquanto está logado."
    };
  }

  if (participant.role === "admin") {
    const { count, error: countError } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return { ok: false, message: countError.message };
    }

    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Não é possível excluir o último administrador." };
    }
  }

  if (participant.auth_user_id) {
    const { error } = await supabase.auth.admin.deleteUser(participant.auth_user_id);

    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participant.id);

    if (error) {
      return { ok: false, message: error.message };
    }
  }

  try {
    await recalculateLeaderboardOrThrow(supabase);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Participante excluído, mas a tabela não foi recalculada: ${error.message}`
          : "Participante excluído, mas a tabela não foi recalculada."
    };
  }

  revalidateParticipantPages();
  return { ok: true, message: "Participante excluído." };
}

export async function resetAllPoints(
  _previousState: ActionState = defaultState,
  _formData?: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error: predictionsError } = await supabase
    .from("predictions")
    .update({ points_awarded: 0 })
    .not("id", "is", null);

  if (predictionsError) {
    console.error("Falha ao resetar pontos dos palpites:", predictionsError);
    return {
      ok: false,
      message: "Não foi possível resetar os pontos dos palpites."
    };
  }

  const { error: participantsError } = await supabase
    .from("participants")
    .update({ total_points: 0 })
    .not("id", "is", null);

  if (participantsError) {
    console.error("Falha ao resetar pontos dos participantes:", participantsError);
    return {
      ok: false,
      message: "Os palpites foram zerados, mas não foi possível zerar a tabela."
    };
  }

  revalidateParticipantPages();
  return { ok: true, message: "Todos os pontos foram resetados com sucesso." };
}

export async function updateParticipantPoints(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const participantId = String(formData.get("participant_id") ?? "");
  const totalPoints = Number(formData.get("total_points"));

  if (!participantId) {
    return { ok: false, message: "Participante inválido." };
  }

  if (!Number.isInteger(totalPoints) || totalPoints < 0) {
    return { ok: false, message: "Informe uma pontuação inteira e não negativa." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .single();

  if (participantError || !participant) {
    return { ok: false, message: "Participante não encontrado." };
  }

  const { error: updateError } = await supabase
    .from("participants")
    .update({ total_points: totalPoints })
    .eq("id", participantId);

  if (updateError) {
    console.error("Falha ao atualizar pontos do participante:", updateError);
    return { ok: false, message: "Não foi possível atualizar os pontos." };
  }

  revalidateParticipantPages();
  return { ok: true, message: "Pontos atualizados com sucesso." };
}

export async function createMatch(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const startsAtIso = parseBrasiliaStartsAt(startsAt);

  if (!homeTeam || !awayTeam || !startsAt) {
    return { ok: false, message: "Seleções e horário são obrigatórios." };
  }

  if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
    return { ok: false, message: "Selecione apenas equipes disponíveis na lista." };
  }

  if (homeTeam === awayTeam) {
    return {
      ok: false,
      message: "A seleção mandante e a visitante não podem ser iguais."
    };
  }

  if (!startsAtIso) {
    return {
      ok: false,
      message: "Informe uma data e hora válidas no Horário de Brasília."
    };
  }

  const { error } = await supabase.from("matches").insert({
    home_team: homeTeam,
    away_team: awayTeam,
    starts_at: startsAtIso,
    round: optionalText(formData.get("round")),
    group_name: optionalText(formData.get("group_name"))
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateMatchPages();
  return { ok: true, message: "Jogo criado." };
}

export async function updateMatch(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const matchId = String(formData.get("match_id") ?? "");
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const status = String(formData.get("status") ?? "") as MatchStatus;
  const homeScore = optionalScore(formData.get("home_score"));
  const awayScore = optionalScore(formData.get("away_score"));

  if (!matchId) {
    return { ok: false, message: "Jogo inválido." };
  }

  const { data: existingData, error: existingError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (existingError || !existingData) {
    return { ok: false, message: "Jogo não encontrado." };
  }

  if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
    return { ok: false, message: "Selecione apenas equipes disponíveis na lista." };
  }

  if (homeTeam === awayTeam) {
    return {
      ok: false,
      message: "A seleção mandante e a visitante não podem ser iguais."
    };
  }

  const startsAtIso = parseBrasiliaStartsAt(startsAt);

  if (!startsAtIso) {
    return {
      ok: false,
      message: "Informe uma data e hora válidas no Horário de Brasília."
    };
  }

  if (!["scheduled", "live", "finished"].includes(status)) {
    return { ok: false, message: "Status do jogo inválido." };
  }

  if (!homeScore.valid || !awayScore.valid) {
    return { ok: false, message: "Informe placares inteiros e não negativos." };
  }

  if (status === "finished" && (homeScore.value === null || awayScore.value === null)) {
    return { ok: false, message: "Informe os dois placares para finalizar o jogo." };
  }

  if (process.env.NODE_ENV === "development" && status === "finished") {
    console.log("[finalizeMatch] called", {
      matchId,
      homeScore: homeScore.value,
      awayScore: awayScore.value,
      status
    });
  }

  const { data: updatedData, error: updateError } = await supabase
    .from("matches")
    .update({
      home_team: homeTeam,
      away_team: awayTeam,
      starts_at: startsAtIso,
      round: optionalText(formData.get("round")),
      group_name: optionalText(formData.get("group_name")),
      status,
      home_score: homeScore.value,
      away_score: awayScore.value
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (updateError || !updatedData) {
    return {
      ok: false,
      message: updateError?.message ?? "Não foi possível atualizar o jogo."
    };
  }

  const updatedMatch = updatedData as Match;

  if (status === "finished" || (existingData as Match).status === "finished") {
    try {
      const scoreResult = await recalculateMatchPoints(supabase, updatedMatch);
      if (status === "finished") {
        revalidateMatchPages();
        return {
          ok: true,
          message: `Jogo atualizado e pontuacao recalculada para ${scoreResult.scoredCount} palpites.`
        };
      }
    } catch (error) {
      console.error("Falha ao recalcular pontos após editar jogo:", error);
      return {
        ok: false,
        message: "Jogo atualizado, mas não foi possível recalcular a pontuação."
      };
    }
  }

  revalidateMatchPages();
  return { ok: true, message: "Jogo atualizado com sucesso." };
}

export async function deleteMatch(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const matchId = String(formData.get("match_id") ?? "");

  if (!matchId) {
    return { ok: false, message: "Jogo inválido." };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return { ok: false, message: "Jogo não encontrado." };
  }

  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  try {
    await recalculateLeaderboardOrThrow(supabase);
  } catch (error) {
    console.error("Falha ao recalcular tabela após excluir jogo:", error);
    return {
      ok: false,
      message: "Jogo excluído, mas não foi possível recalcular a tabela."
    };
  }

  revalidateMatchPages();
  return { ok: true, message: "Jogo excluído com sucesso." };
}

export async function finishMatch(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const matchId = String(formData.get("match_id") ?? "");
  const homeScore = optionalScore(formData.get("home_score"));
  const awayScore = optionalScore(formData.get("away_score"));

  if (
    !matchId ||
    !homeScore.valid ||
    !awayScore.valid ||
    homeScore.value === null ||
    awayScore.value === null
  ) {
    return { ok: false, message: "Informe placares válidos." };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[finishMatch] called", {
      matchId,
      homeScore: homeScore.value,
      awayScore: awayScore.value,
      status: "finished"
    });
  }

  const { data: updatedMatch, error: matchError } = await supabase
    .from("matches")
    .update({
      home_score: homeScore.value,
      away_score: awayScore.value,
      status: "finished"
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (matchError || !updatedMatch) {
    return { ok: false, message: matchError?.message ?? "Não foi possível atualizar o jogo." };
  }

  try {
    const scoreResult = await recalculateMatchPoints(supabase, updatedMatch as Match);
    revalidateMatchPages();
    return {
      ok: true,
      message: `Jogo finalizado e pontuacao recalculada para ${scoreResult.scoredCount} palpites.`
    };
  } catch (error) {
    console.error("Falha ao recalcular pontos após finalizar jogo:", error);
    return {
      ok: false,
      message: "Resultado salvo, mas não foi possível recalcular a pontuação."
    };
  }
}

export async function recalculateAllFinishedMatches(
  _previousState: ActionState = defaultState,
  _formData?: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_score, away_score, status")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  if (matchesError) {
    return { ok: false, message: matchesError.message };
  }

  let totalPredictionsScored = 0;
  const errors: string[] = [];

  for (const match of (matches ?? []) as Pick<
    Match,
    "id" | "home_score" | "away_score" | "status"
  >[]) {
    if (!isValidScore(match.home_score) || !isValidScore(match.away_score)) {
      errors.push(`${match.id}: placar invalido`);
      continue;
    }

    const scoreResult = await scorePredictionsForMatch(
      supabase,
      match.id,
      match.home_score,
      match.away_score
    );

    totalPredictionsScored += scoreResult.scoredCount;
    errors.push(...scoreResult.errors);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: `Nao foi possivel recalcular todos os palpites: ${errors[0]}`
    };
  }

  try {
    await recalculateLeaderboardOrThrow(supabase);
  } catch (error) {
    console.error("Falha ao recalcular tabela geral:", error);
    return {
      ok: false,
      message: "Palpites recalculados, mas nao foi possivel recalcular a tabela."
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[recalculateAllFinishedMatches]", {
      matchesFound: matches?.length ?? 0,
      totalPredictionsScored
    });
  }

  revalidateMatchPages();
  return {
    ok: true,
    message: `Pontuacao recalculada para ${matches?.length ?? 0} jogos finalizados e ${totalPredictionsScored} palpites.`
  };
}

export async function uploadFamilyPhoto(
  _previousState: ActionState = defaultState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const image = formData.get("image") as File | null;
  const title = optionalText(formData.get("title"));
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  const { count, error: countError } = await supabase
    .from("family_photos")
    .select("*", { count: "exact", head: true });

  if (countError) {
    return { ok: false, message: countError.message };
  }

  if ((count ?? 0) >= 3) {
    return { ok: false, message: "O carrossel já tem 3 fotos." };
  }

  try {
    const imageUrl = await uploadPublicFile("family-photos", image);

    if (!imageUrl) {
      return { ok: false, message: "Escolha uma foto para enviar." };
    }

    const { error } = await supabase.from("family_photos").insert({
      image_url: imageUrl,
      title,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
    });

    if (error) {
      return { ok: false, message: error.message };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao enviar foto."
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Foto adicionada." };
}
