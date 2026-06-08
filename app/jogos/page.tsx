import { CalendarDays } from "lucide-react";
import { Header } from "@/components/header";
import { MatchPredictionCard } from "@/components/match-prediction-card";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Match, Prediction } from "@/lib/types";
import { todayRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JogosPage() {
  const participant = await requireParticipant();
  const supabase = createClient();
  const range = todayRange();

  const [matchesResult, predictionsResult] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .gte("starts_at", range.start)
      .lt("starts_at", range.end)
      .order("starts_at", { ascending: true }),
    supabase
      .from("predictions")
      .select("*")
      .eq("participant_id", participant.id)
  ]);

  const predictionsByMatch = new Map(
    ((predictionsResult.data ?? []) as Prediction[]).map((prediction) => [
      prediction.match_id,
      prediction
    ])
  );

  return (
    <>
      <Header participant={participant} />
      <main className="container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Jogos de hoje
            </p>
            <h1 className="text-3xl font-bold tracking-normal">Seus palpites</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Hoje
          </div>
        </div>

        {matchesResult.error || predictionsResult.error ? (
          <div className="rounded-lg border bg-card p-8 text-center text-destructive">
            Não foi possível carregar os jogos.
          </div>
        ) : (matchesResult.data ?? []).length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
            Não há jogos cadastrados para hoje.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {((matchesResult.data ?? []) as Match[]).map((match) => (
              <MatchPredictionCard
                key={match.id}
                match={match}
                prediction={predictionsByMatch.get(match.id) ?? null}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
