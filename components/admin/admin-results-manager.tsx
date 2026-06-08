"use client";

import { useFormState } from "react-dom";
import { finishMatch } from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState, Match } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const initialState: ActionState = { ok: false, message: "" };

function ResultForm({ match }: { match: Match }) {
  const [state, formAction] = useFormState(finishMatch, initialState);

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <input type="hidden" name="match_id" value={match.id} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {match.home_team} x {match.away_team}
          </p>
          <p className="text-sm text-muted-foreground">{formatDateTime(match.starts_at)}</p>
        </div>
        <Badge variant={match.status === "finished" ? "secondary" : "outline"}>
          {match.status === "finished" ? "Finalizado" : "Pendente"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`${match.id}-home-score`}>{match.home_team}</Label>
          <Input
            id={`${match.id}-home-score`}
            name="home_score"
            type="number"
            min={0}
            defaultValue={match.home_score ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${match.id}-away-score`}>{match.away_team}</Label>
          <Input
            id={`${match.id}-away-score`}
            name="away_score"
            type="number"
            min={0}
            defaultValue={match.away_score ?? ""}
            required
          />
        </div>
        <SubmitButton pendingText="Finalizando...">Finalizar</SubmitButton>
      </div>
      <div className="mt-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function AdminResultsManager({ matches }: { matches: Match[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado dos jogos</CardTitle>
        <CardDescription>
          Finalize jogos para calcular 10 pontos pelo resultado e 15 extras pelo
          placar exato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-muted-foreground">
            Nenhum jogo cadastrado.
          </p>
        ) : (
          matches.map((match) => <ResultForm key={match.id} match={match} />)
        )}
      </CardContent>
    </Card>
  );
}
