"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { updateFinalPredictionSettings } from "@/app/actions/final-predictions";
import { ActionMessage } from "@/components/action-message";
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
import { utcIsoToBrasiliaInputValue } from "@/lib/timezone";
import type { ActionState, FinalPredictionSettings } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

function inputDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  return utcIsoToBrasiliaInputValue(value);
}

export function AdminFinalPredictionSettings({
  settings
}: {
  settings: FinalPredictionSettings;
}) {
  const [state, formAction] = useFormState(
    updateFinalPredictionSettings,
    initialState
  );
  const [enabled, setEnabled] = useState(settings.is_enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Palpite da Final</CardTitle>
        <CardDescription>
          Defina o prazo para envio, a liberação dos palpites e se o recurso está ativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium">
            <input
              type="checkbox"
              name="is_enabled"
              value="true"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4"
            />
            Ativar palpite da final
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prediction_deadline_at">Prazo para palpitar</Label>
              <Input
                id="prediction_deadline_at"
                name="prediction_deadline_at"
                type="datetime-local"
                defaultValue={inputDateTime(settings.prediction_deadline_at)}
                required={enabled}
              />
              <p className="text-xs text-muted-foreground">
                Informe o horário de Brasília.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility_at">Liberação dos palpites</Label>
              <Input
                id="visibility_at"
                name="visibility_at"
                type="datetime-local"
                defaultValue={inputDateTime(settings.visibility_at)}
                required={enabled}
              />
              <p className="text-xs text-muted-foreground">
                Deve ser igual ou posterior ao prazo para palpitar.
              </p>
            </div>
          </div>

          <SubmitButton pendingText="Salvando configuração...">
            Salvar configuração
          </SubmitButton>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
