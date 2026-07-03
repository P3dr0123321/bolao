import { getFinalPredictionSettings } from "@/app/actions/final-predictions";
import { AdminFamilyPhotosManager } from "@/components/admin/admin-family-photos-manager";
import { AdminFinalPredictionSettings } from "@/components/admin/admin-final-prediction-settings";
import { AdminMatchForm } from "@/components/admin/admin-match-form";
import { AdminMatchesManager } from "@/components/admin/admin-matches-manager";
import { AdminParticipantForm } from "@/components/admin/admin-participant-form";
import { AdminParticipantsManager } from "@/components/admin/admin-participants-manager";
import { AdminPointsManager } from "@/components/admin/admin-points-manager";
import { AdminResultsManager } from "@/components/admin/admin-results-manager";
import { Header } from "@/components/header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  FamilyPhoto,
  FinalPredictionSettings,
  Match,
  Participant
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const participant = await requireAdmin();
  const supabase = createClient();

  const [
    participantsResult,
    matchesResult,
    photosResult,
    finalPredictionSettings
  ] = await Promise.all([
    supabase
      .from("participants")
      .select(
        "id, auth_user_id, username, full_name, avatar_url, role, total_points, created_at"
      )
      .order("full_name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .order("starts_at", { ascending: false }),
    supabase
      .from("family_photos")
      .select("*")
      .order("sort_order", { ascending: true }),
    getFinalPredictionSettings()
  ]);

  return (
    <>
      <Header participant={participant} />
      <main className="container py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Administração
          </p>
          <h1 className="text-3xl font-bold tracking-normal">Painel do Bolão</h1>
          <p className="mt-2 text-muted-foreground">
            Cadastre participantes, jogos, resultados e fotos da capa.
          </p>
        </div>

        <div className="grid gap-6">
          <AdminParticipantForm />
          {participantsResult.error ? (
            <div className="rounded-lg border bg-card p-8 text-center text-destructive">
              Não foi possível carregar os participantes.
            </div>
          ) : (
            <AdminParticipantsManager
              participants={(participantsResult.data ?? []) as Participant[]}
            />
          )}
          {!participantsResult.error ? (
            <AdminPointsManager
              participants={(participantsResult.data ?? []) as Participant[]}
              className="pt-0"
            />
          ) : null}
          <AdminFinalPredictionSettings
            settings={finalPredictionSettings as FinalPredictionSettings}
          />
          <AdminMatchForm />
          {matchesResult.error ? (
            <div className="rounded-lg border bg-card p-8 text-center text-destructive">
              Não foi possível carregar os jogos.
            </div>
          ) : (
            <>
              <AdminMatchesManager matches={(matchesResult.data ?? []) as Match[]} />
              <AdminResultsManager matches={(matchesResult.data ?? []) as Match[]} />
            </>
          )}
          {photosResult.error ? (
            <div className="rounded-lg border bg-card p-8 text-center text-destructive">
              Não foi possível carregar as fotos.
            </div>
          ) : (
            <AdminFamilyPhotosManager
              photos={(photosResult.data ?? []) as FamilyPhoto[]}
            />
          )}
        </div>
      </main>
    </>
  );
}
