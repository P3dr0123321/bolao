"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createParticipant } from "@/app/actions/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ActionState } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

export function AdminParticipantForm() {
  const [state, formAction] = useFormState(createParticipant, initialState);
  const [role, setRole] = useState("participant");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo participante</CardTitle>
        <CardDescription>Cria login, perfil e avatar do familiar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <input type="hidden" name="role" value={role} />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" className="h-10 w-full rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participante</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar</Label>
            <Input id="avatar" name="avatar" type="file" accept="image/*" />
          </div>
          <SubmitButton pendingText="Criando...">Criar participante</SubmitButton>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
