"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Trophy } from "lucide-react";
import { saveFinalPrediction } from "@/app/actions/final-predictions";
import { ActionMessage } from "@/components/action-message";
import { TeamSelect } from "@/components/admin/team-select";
import { FinalPredictionsDialog } from "@/components/final-predictions-dialog";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getTeamCrestUrl, TEAMS } from "@/lib/teams";
import type { ActionState, FinalPredictionState } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const initialState: ActionState = { ok: false, message: "" };

function TeamSummary({ name }: { name: string }) {
  const crest = getTeamCrestUrl(name);

  return (
    <span className="inline-flex items-center gap-2">
      {crest ? (
        <Image
          src={crest}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

export function FinalPredictionCard({
  state
}: {
  state: FinalPredictionState;
}) {
  const router = useRouter();
  const [actionState, formAction] = useFormState(
    saveFinalPrediction,
    initialState
  );
  const [finalistOne, setFinalistOne] = useState(
    state.prediction?.finalist_one ?? ""
  );
  const [finalistTwo, setFinalistTwo] = useState(
    state.prediction?.finalist_two ?? ""
  );
  const [winner, setWinner] = useState(state.prediction?.winner ?? "");
  const sameFinalist = Boolean(
    finalistOne && finalistTwo && finalistOne === finalistTwo
  );
  const championOptions = useMemo(
    () =>
      finalistOne && finalistTwo && finalistOne !== finalistTwo
        ? TEAMS.filter(
            (team) => team.name === finalistOne || team.name === finalistTwo
          )
        : [],
    [finalistOne, finalistTwo]
  );
  const championOptionNames = useMemo(
    () => championOptions.map((team) => team.name),
    [championOptions]
  );
  const winnerIsValid = Boolean(winner && championOptionNames.includes(winner));
  const formValid = Boolean(
    finalistOne && finalistTwo && winnerIsValid && !sameFinalist
  );

  useEffect(() => {
    if (winner && !championOptionNames.includes(winner)) {
      setWinner("");
    }
  }, [championOptionNames, winner]);

  if (process.env.NODE_ENV === "development") {
    console.log("[FinalPredictionCard]", {
      finalistOne,
      finalistTwo,
      winner,
      championOptions: championOptionNames,
      championOptionsCount: championOptions.length
    });
  }

  useEffect(() => {
    if (actionState.ok) {
      router.refresh();
    }
  }, [actionState.ok, router]);

  const predictionDeadline = state.settings?.prediction_deadline_at;
  const visibilityAt = state.settings?.visibility_at;
  const inputsDisabled = !state.canSubmit;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Palpite da Final
            </CardTitle>
            <CardDescription>
              Escolhe os dois finalistas e quem será o campeão.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!state.isEnabled ? (
          <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            O palpite da final ainda não está disponível.
          </p>
        ) : null}

        {state.prediction ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-semibold">O teu palpite salvo</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <TeamSummary name={state.prediction.finalist_one} />
              <span className="text-muted-foreground">x</span>
              <TeamSummary name={state.prediction.finalist_two} />
              <span className="text-muted-foreground">Campeão:</span>
              <TeamSummary name={state.prediction.winner} />
            </div>
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="finalist_one">Finalista 1</Label>
              <TeamSelect
                id="finalist_one"
                name="finalist_one"
                value={finalistOne}
                onValueChange={setFinalistOne}
                placeholder="Selecione o finalista"
                disabled={inputsDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalist_two">Finalista 2</Label>
              <TeamSelect
                id="finalist_two"
                name="finalist_two"
                value={finalistTwo}
                onValueChange={setFinalistTwo}
                placeholder="Selecione o finalista"
                disabled={inputsDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="winner">Campeão</Label>
              <TeamSelect
                id="winner"
                name="winner"
                value={winner}
                onValueChange={setWinner}
                placeholder="Selecione o campeão"
                disabled={inputsDisabled || championOptions.length !== 2}
                teams={championOptions}
              />
            </div>
          </div>

          {sameFinalist ? (
            <p className="text-sm font-medium text-destructive">
              Finalista 1 e Finalista 2 não podem ser iguais.
            </p>
          ) : null}

          <div className="space-y-1 text-sm text-muted-foreground">
            {state.isEnabled && predictionDeadline && !state.predictionDeadlinePassed ? (
              <p>Podes editar o teu palpite até {formatDateTime(predictionDeadline)}.</p>
            ) : null}
            {state.isEnabled && state.predictionDeadlinePassed ? (
              <p>O prazo para alterar o palpite da final terminou.</p>
            ) : null}
            {state.isEnabled && visibilityAt && !state.visibilityPassed ? (
              <p>Os palpites da final serão liberados em {formatDateTime(visibilityAt)}.</p>
            ) : null}
            {state.isEnabled && state.visibilityPassed ? (
              <p>Palpites da final liberados.</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <SubmitButton
              pendingText="Salvando palpite da final..."
              disabled={!state.canSubmit || !formValid}
            >
              Salvar palpite da final
            </SubmitButton>
            <FinalPredictionsDialog canViewAll={state.canViewAll} />
          </div>
          <ActionMessage state={actionState} />
        </form>
      </CardContent>
    </Card>
  );
}
