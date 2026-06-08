import { AdminPointsManager } from "@/components/admin/admin-points-manager";
import { FamilyCarousel } from "@/components/family-carousel";
import { Header } from "@/components/header";
import { HomeDailyMatches } from "@/components/home-daily-matches";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FamilyPhoto, Match, Participant } from "@/lib/types";
import { todayRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const participant = await requireParticipant();
  const supabase = createClient();
  const range = todayRange();

  const [participantsResult, photosResult, matchesResult] = await Promise.all([
    supabase
      .from("participants")
      .select("*")
      .order("total_points", { ascending: false })
      .order("full_name", { ascending: true }),
    supabase
      .from("family_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .limit(3),
    supabase
      .from("matches")
      .select(
        "id, home_team, away_team, home_score, away_score, starts_at, status, round, group_name, created_at"
      )
      .gte("starts_at", range.start)
      .lt("starts_at", range.end)
      .order("starts_at", { ascending: true })
  ]);

  const participants = (participantsResult.data ?? []) as Participant[];

  return (
    <>
      <Header participant={participant} />
      <main>
        <FamilyCarousel photos={(photosResult.data ?? []) as FamilyPhoto[]} />

        {matchesResult.error ? (
          <section className="container pt-10">
            <div className="rounded-lg border bg-card p-8 text-center text-destructive">
              Não foi possível carregar os jogos de hoje.
            </div>
          </section>
        ) : (
          <HomeDailyMatches matches={(matchesResult.data ?? []) as Match[]} />
        )}

        {participant.role === "admin" && !participantsResult.error ? (
          <AdminPointsManager participants={participants} />
        ) : null}

        <section className="container py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Ranking
              </p>
              <h2 className="text-3xl font-bold tracking-normal">Tabela de Pontos</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {participant.full_name}
            </p>
          </div>
          {participantsResult.error ? (
            <div className="rounded-lg border bg-card p-8 text-center text-destructive">
              Não foi possível carregar a tabela de pontos.
            </div>
          ) : (
            <LeaderboardTable participants={participants} />
          )}
        </section>
      </main>
    </>
  );
}
