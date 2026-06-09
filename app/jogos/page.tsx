import { CalendarDays } from "lucide-react";
import { Header } from "@/components/header";
import { MatchPredictionCard } from "@/components/match-prediction-card";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Match,
  MatchStatus,
  Prediction,
  PredictionParticipant,
  PredictionWithParticipant
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const sectionStyles: Record<MatchStatus, string> = {
  scheduled: "border-emerald-200 bg-emerald-50 text-emerald-800",
  live: "border-red-200 bg-red-50 text-red-800",
  finished: "border-slate-200 bg-slate-100 text-slate-700"
};

function MatchSection({
  title,
  status,
  matches,
  emptyMessage,
  predictionsByMatch,
  allPredictionsByMatch
}: {
  title: string;
  status: MatchStatus;
  matches: Match[];
  emptyMessage: string;
  predictionsByMatch: Map<string, Prediction>;
  allPredictionsByMatch: Map<string, PredictionWithParticipant[]>;
}) {
  return (
    <section className="space-y-4">
      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-lg font-bold",
          sectionStyles[status]
        )}
      >
        {title}
      </div>
      {matches.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => (
            <MatchPredictionCard
              key={match.id}
              match={match}
              prediction={predictionsByMatch.get(match.id) ?? null}
              allPredictions={allPredictionsByMatch.get(match.id) ?? []}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function JogosPage() {
  const participant = await requireParticipant();
  const supabase = createClient();

  const [
    matchesResult,
    predictionsResult,
    allPredictionsResult,
    participantSummariesResult
  ] = await Promise.all([
    supabase.from("matches").select("*").order("starts_at", { ascending: true }),
    supabase
      .from("predictions")
      .select("*")
      .eq("participant_id", participant.id),
    supabase.from("predictions").select("*"),
    supabase
      .from("participants")
      .select("id, username, full_name, avatar_url")
  ]);

  const matches = (matchesResult.data ?? []) as Match[];
  const predictionsByMatch = new Map(
    ((predictionsResult.data ?? []) as Prediction[]).map((prediction) => [
      prediction.match_id,
      prediction
    ])
  );

  const participantsById = new Map(
    ((participantSummariesResult.data ?? []) as PredictionParticipant[]).map(
      (participantSummary) => [participantSummary.id, participantSummary]
    )
  );
  const allPredictionsByMatch = new Map<string, PredictionWithParticipant[]>();

  for (const prediction of (allPredictionsResult.data ?? []) as Prediction[]) {
    const predictionParticipant = participantsById.get(prediction.participant_id);

    if (!predictionParticipant) {
      continue;
    }

    const predictionsForMatch = allPredictionsByMatch.get(prediction.match_id) ?? [];
    predictionsForMatch.push({
      ...prediction,
      participant: predictionParticipant
    });
    predictionsForMatch.sort((a, b) =>
      a.participant.full_name.localeCompare(b.participant.full_name, "pt-BR")
    );
    allPredictionsByMatch.set(prediction.match_id, predictionsForMatch);
  }

  const scheduledMatches = matches.filter((match) => match.status === "scheduled");
  const liveMatches = matches.filter((match) => match.status === "live");
  const finishedMatches = matches.filter((match) => match.status === "finished");
  const hasError =
    matchesResult.error ||
    predictionsResult.error ||
    allPredictionsResult.error ||
    participantSummariesResult.error;

  return (
    <>
      <Header participant={participant} />
      <main className="container py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Todos os jogos
            </p>
            <h1 className="text-3xl font-bold tracking-normal">Seus palpites</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Todas as partidas
          </div>
        </div>

        {hasError ? (
          <div className="rounded-lg border bg-card p-8 text-center text-destructive">
            Não foi possível carregar os jogos e palpites.
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
            Nenhum jogo cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-10">
            <MatchSection
              title="Agendado"
              status="scheduled"
              matches={scheduledMatches}
              emptyMessage="Não há jogos agendados."
              predictionsByMatch={predictionsByMatch}
              allPredictionsByMatch={allPredictionsByMatch}
            />

            {liveMatches.length > 0 ? (
              <MatchSection
                title="Ao vivo"
                status="live"
                matches={liveMatches}
                emptyMessage="Não há jogos ao vivo."
                predictionsByMatch={predictionsByMatch}
                allPredictionsByMatch={allPredictionsByMatch}
              />
            ) : null}

            <MatchSection
              title="Finalizado"
              status="finished"
              matches={finishedMatches}
              emptyMessage="Nenhum jogo finalizado ainda."
              predictionsByMatch={predictionsByMatch}
              allPredictionsByMatch={allPredictionsByMatch}
            />
          </div>
        )}
      </main>
    </>
  );
}
