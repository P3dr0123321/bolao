import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export type RecalculateLeaderboardResult = {
  ok: boolean;
  participantsUpdated: number;
  predictionsCount: number;
  errors: string[];
};

export async function recalculateLeaderboard(
  supabase: SupabaseAdminClient = createAdminClient()
): Promise<RecalculateLeaderboardResult> {
  const errors: string[] = [];

  const { data: participants, error: participantsError } = await supabase
    .from("participants")
    .select("id, full_name");

  if (participantsError) {
    errors.push(participantsError.message);
    if (process.env.NODE_ENV === "development") {
      console.error("[recalculateLeaderboard] errors", errors);
    }
    return {
      ok: false,
      participantsUpdated: 0,
      predictionsCount: 0,
      errors
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[recalculateLeaderboard] participants count", participants?.length ?? 0);
  }

  const totals = new Map<string, number>();

  for (const participant of participants ?? []) {
    totals.set(participant.id, 0);
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("participant_id, points_awarded");

  if (predictionsError) {
    errors.push(predictionsError.message);
    if (process.env.NODE_ENV === "development") {
      console.error("[recalculateLeaderboard] errors", errors);
    }
    return {
      ok: false,
      participantsUpdated: 0,
      predictionsCount: 0,
      errors
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[recalculateLeaderboard] predictions count", predictions?.length ?? 0);
  }

  for (const prediction of predictions ?? []) {
    totals.set(
      prediction.participant_id,
      (totals.get(prediction.participant_id) ?? 0) +
        Number(prediction.points_awarded ?? 0)
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[recalculateLeaderboard] totals",
      Object.fromEntries(totals.entries())
    );
  }

  const updateResults = await Promise.all(
    (participants ?? []).map((participant) =>
      supabase
        .from("participants")
        .update({ total_points: totals.get(participant.id) ?? 0 })
        .eq("id", participant.id)
    )
  );

  updateResults.forEach((result, index) => {
    if (result.error) {
      errors.push(
        `${participants?.[index]?.id ?? "unknown"}: ${result.error.message}`
      );
    }
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[recalculateLeaderboard] participants updated",
      updateResults.filter((result) => !result.error).length
    );

    console.log("[recalculateLeaderboard] errors", errors);

    const { data: verification, error: verificationError } = await supabase
      .from("participants")
      .select("id, full_name, total_points")
      .order("total_points", { ascending: false });

    if (verificationError) {
      console.error("[recalculateLeaderboard] verification error", verificationError.message);
    } else {
      console.log("[recalculateLeaderboard] verification", verification ?? []);
    }
  }

  return {
    ok: errors.length === 0,
    participantsUpdated: updateResults.filter((result) => !result.error).length,
    predictionsCount: predictions?.length ?? 0,
    errors
  };
}
