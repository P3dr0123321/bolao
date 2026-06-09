"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createMatch } from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { TeamSelect } from "@/components/admin/team-select";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

export function AdminMatchForm() {
  const [state, formAction] = useFormState(createMatch, initialState);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const sameTeam = Boolean(homeTeam && awayTeam && homeTeam === awayTeam);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar jogo</CardTitle>
        <CardDescription>Cadastre partidas disponíveis para palpites.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="home_team">Seleção mandante</Label>
              <TeamSelect
                id="home_team"
                name="home_team"
                value={homeTeam}
                onValueChange={setHomeTeam}
                placeholder="Selecione a mandante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="away_team">Seleção visitante</Label>
              <TeamSelect
                id="away_team"
                name="away_team"
                value={awayTeam}
                onValueChange={setAwayTeam}
                placeholder="Selecione a visitante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Data e hora do jogo</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
              <p className="text-xs text-muted-foreground">
                Informe o horário de Brasília.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="round">Fase</Label>
              <Input id="round" name="round" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="group_name">Grupo</Label>
              <Input id="group_name" name="group_name" />
            </div>
          </div>
          {sameTeam ? (
            <p className="text-sm font-medium text-destructive">
              A seleção mandante e a visitante não podem ser iguais.
            </p>
          ) : null}
          <SubmitButton
            pendingText="Criando..."
            disabled={sameTeam || !homeTeam || !awayTeam}
          >
            Criar jogo
          </SubmitButton>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
