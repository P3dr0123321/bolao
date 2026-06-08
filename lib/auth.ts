import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Participant } from "@/lib/types";

export async function getCurrentParticipant() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Participant;
}

export async function requireParticipant() {
  const participant = await getCurrentParticipant();

  if (!participant) {
    redirect("/login");
  }

  return participant;
}

export async function requireAdmin() {
  const participant = await requireParticipant();

  if (participant.role !== "admin") {
    redirect("/");
  }

  return participant;
}

export function isAdmin(participant: Participant | null) {
  return participant?.role === "admin";
}
