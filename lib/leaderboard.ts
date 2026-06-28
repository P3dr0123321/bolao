import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function recalculateLeaderboard() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("participant_id, points_awarded");

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<string, number>();

  for (const prediction of data ?? []) {
    totals.set(
      prediction.participant_id,
      (totals.get(prediction.participant_id) ?? 0) +
        Number(prediction.points_awarded ?? 0)
    );
  }

  const { data: participants, error: participantsError } = await supabase
    .from("participants")
    .select("id");

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  const updateResults = await Promise.all(
    (participants ?? []).map((participant) =>
      supabase
        .from("participants")
        .update({ total_points: totals.get(participant.id) ?? 0 })
        .eq("id", participant.id)
    )
  );

  const updateError = updateResults.find((result) => result.error)?.error;

  if (updateError) {
    throw new Error(updateError.message);
  }
}
