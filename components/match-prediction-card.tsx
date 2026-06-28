"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import { Clock, Lock, Medal } from "lucide-react";
import { savePrediction } from "@/app/actions/predictions";
import { ActionMessage } from "@/components/action-message";
import { MatchCountdown } from "@/components/match-countdown";
import { MatchPredictionsDialog } from "@/components/match-predictions-dialog";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTeamCrestUrl } from "@/lib/teams";
import type { ActionState, Match, Prediction } from "@/lib/types";
import {
  formatDateTime,
  getPredictionResultMessage
} from "@/lib/utils";

const initialState: ActionState = {
  ok: false,
  message: ""
};

function statusLabel(status: Match["status"]) {
  if (status === "finished") return "Finalizado";
  if (status === "live") return "Ao vivo";
  return "Agendado";
}

export function MatchPredictionCard({
  match,
  prediction,
  initialCanViewPredictions
}: {
  match: Match;
  prediction: Prediction | null;
  initialCanViewPredictions: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(savePrediction, initialState);
  const [deadlineReached, setDeadlineReached] = useState(
    initialCanViewPredictions || match.status === "finished"
  );
  const locked = match.status === "finished" || deadlineReached;
  const homeCrest = getTeamCrestUrl(match.home_team);
  const awayCrest = getTeamCrestUrl(match.away_team);
  const resultMessage = prediction
    ? getPredictionResultMessage(prediction, match)
    : null;
  const scoringExplanation =
    prediction?.points_awarded === 25
      ? "Pontuação: 10 pelo resultado + 15 pelo placar exato."
      : prediction?.points_awarded === 10
        ? "Pontuação: 10 pelo resultado."
        : "Não pontuou neste jogo.";
  const handleDeadlineComplete = useCallback(() => {
    setDeadlineReached(true);
    router.refresh();
  }, [router]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {homeCrest ? (
                  <Image
                    src={homeCrest}
                    alt={`Escudo de ${match.home_team}`}
                    width={48}
                    height={48}
                    className="h-10 w-10 shrink-0 object-contain"
                  />
                ) : null}
                <CardTitle className="truncate text-base">{match.home_team}</CardTitle>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">x</span>
              <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                <CardTitle className="truncate text-base">{match.away_team}</CardTitle>
                {awayCrest ? (
                  <Image
                    src={awayCrest}
                    alt={`Escudo de ${match.away_team}`}
                    width={48}
                    height={48}
                    className="h-10 w-10 shrink-0 object-contain"
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDateTime(match.starts_at)}
              </span>
              {match.round ? <span>{match.round}</span> : null}
              {match.group_name ? <span>{match.group_name}</span> : null}
            </div>
          </div>
          <Badge variant={match.status === "finished" ? "secondary" : "default"}>
            {statusLabel(match.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {match.status === "finished" ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <p className="font-semibold">
              Placar final: {match.home_score} x {match.away_score}
            </p>
            {resultMessage ? (
              <p className="mt-1 font-semibold text-emerald-800">{resultMessage}</p>
            ) : null}
            <p className="mt-1 flex items-center gap-2 text-sm text-emerald-800">
              <Medal className="h-4 w-4" />
              Você fez {prediction?.points_awarded ?? 0} pontos neste jogo.
            </p>
            <p className="mt-1 text-xs text-emerald-800">{scoringExplanation}</p>
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="match_id" value={match.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-home`}>{match.home_team}</Label>
              <Input
                id={`${match.id}-home`}
                name="predicted_home_score"
                type="number"
                min={0}
                defaultValue={prediction?.predicted_home_score ?? ""}
                disabled={locked}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-away`}>{match.away_team}</Label>
              <Input
                id={`${match.id}-away`}
                name="predicted_away_score"
                type="number"
                min={0}
                defaultValue={prediction?.predicted_away_score ?? ""}
                disabled={locked}
                required
              />
            </div>
          </div>

          {locked ? (
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              {prediction
                ? "Palpite bloqueado: o prazo terminou 1 hora antes do jogo."
                : "Camarão que dorme a onda leva!"}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Palpites bloqueiam e ficam visíveis em{" "}
                <MatchCountdown
                  startsAt={match.starts_at}
                  onComplete={handleDeadlineComplete}
                />
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!locked ? (
              <SubmitButton pendingText="Salvando palpite...">
                {prediction ? "Atualizar palpite" : "Salvar palpite"}
              </SubmitButton>
            ) : null}
            <MatchPredictionsDialog
              match={match}
              canViewPredictions={deadlineReached}
            />
          </div>
          {!deadlineReached ? (
            <p className="text-xs text-muted-foreground">
              Os palpites serão liberados 1 hora antes do jogo.
            </p>
          ) : null}
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
