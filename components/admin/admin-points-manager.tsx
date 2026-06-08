"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { RotateCcw } from "lucide-react";
import {
  resetAllPoints,
  updateParticipantPoints
} from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActionState, Participant } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ParticipantPointsRow({ participant }: { participant: Participant }) {
  const [state, formAction] = useFormState(updateParticipantPoints, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_110px_auto] sm:items-center"
    >
      <input type="hidden" name="participant_id" value={participant.id} />
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 border">
          <AvatarImage
            src={participant.avatar_url ?? undefined}
            alt={participant.full_name}
          />
          <AvatarFallback>{getInitials(participant.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{participant.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{participant.username} · Atual: {participant.total_points}
          </p>
        </div>
      </div>
      <Input
        name="total_points"
        type="number"
        min={0}
        step={1}
        defaultValue={participant.total_points}
        aria-label={`Pontos de ${participant.full_name}`}
        required
      />
      <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
      <div className="sm:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function ResetPointsDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(resetAllPoints, initialState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          <RotateCcw className="h-4 w-4" />
          Resetar todos os pontos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar todos os pontos</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja resetar todos os pontos? Esta ação também
            zerará os pontos dos palpites já calculados.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <ActionMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              pendingText="Resetando..."
            >
              Confirmar reset
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPointsManager({ participants }: { participants: Participant[] }) {
  return (
    <section className="container pt-10">
      <Card>
        <CardHeader>
          <CardTitle>Administração de pontos</CardTitle>
          <CardDescription>
            Ajuste manualmente a pontuação da família ou zere toda a tabela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">Reset completo da pontuação</p>
              <p className="text-sm text-muted-foreground">
                Zera os totais dos participantes e os pontos dos palpites.
              </p>
            </div>
            <ResetPointsDialog />
          </div>

          <p className="rounded-lg border border-secondary bg-secondary/40 p-3 text-sm text-muted-foreground">
            Alterações manuais nos pontos podem ser sobrescritas se a pontuação
            for recalculada a partir dos palpites.
          </p>

          <div className="space-y-3">
            {participants.map((participant) => (
              <ParticipantPointsRow key={participant.id} participant={participant} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
