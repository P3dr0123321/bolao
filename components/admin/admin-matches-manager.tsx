"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { deleteMatch, updateMatch } from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { TeamSelect } from "@/components/admin/team-select";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ActionState, Match, MatchStatus } from "@/lib/types";
import { getTeamCrestUrl } from "@/lib/teams";
import { formatDateTime } from "@/lib/utils";

const initialState: ActionState = { ok: false, message: "" };

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function statusLabel(status: MatchStatus) {
  if (status === "finished") return "Finalizado";
  if (status === "live") return "Ao vivo";
  return "Agendado";
}

function TeamSummary({ name }: { name: string }) {
  const crest = getTeamCrestUrl(name);

  return (
    <span className="flex items-center gap-2">
      {crest ? (
        <Image
          src={crest}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function EditMatchDialog({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [homeTeam, setHomeTeam] = useState(match.home_team);
  const [awayTeam, setAwayTeam] = useState(match.away_team);
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [state, formAction] = useFormState(updateMatch, initialState);
  const sameTeam = homeTeam === awayTeam;

  useEffect(() => {
    if (open) {
      setHomeTeam(match.home_team);
      setAwayTeam(match.away_team);
      setStatus(match.status);
    }
  }, [open, match.away_team, match.home_team, match.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar jogo</DialogTitle>
          <DialogDescription>
            Atualize as seleções, horário, fase, grupo, status ou placar.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="match_id" value={match.id} />
          <input type="hidden" name="status" value={status} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-home-team`}>Seleção mandante</Label>
              <TeamSelect
                id={`${match.id}-home-team`}
                name="home_team"
                value={homeTeam}
                onValueChange={setHomeTeam}
                placeholder="Selecione a mandante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-away-team`}>Seleção visitante</Label>
              <TeamSelect
                id={`${match.id}-away-team`}
                name="away_team"
                value={awayTeam}
                onValueChange={setAwayTeam}
                placeholder="Selecione a visitante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-starts-at`}>Início</Label>
              <Input
                id={`${match.id}-starts-at`}
                name="starts_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(match.starts_at)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-status`}>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as MatchStatus)}>
                <SelectTrigger
                  id={`${match.id}-status`}
                  className="h-10 w-full rounded-md bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground">
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="live">Ao vivo</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-round`}>Fase</Label>
              <Input id={`${match.id}-round`} name="round" defaultValue={match.round ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-group`}>Grupo</Label>
              <Input
                id={`${match.id}-group`}
                name="group_name"
                defaultValue={match.group_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-home-score`}>Placar de {homeTeam}</Label>
              <Input
                id={`${match.id}-home-score`}
                name="home_score"
                type="number"
                min={0}
                defaultValue={match.home_score ?? ""}
                required={status === "finished"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${match.id}-away-score`}>Placar de {awayTeam}</Label>
              <Input
                id={`${match.id}-away-score`}
                name="away_score"
                type="number"
                min={0}
                defaultValue={match.away_score ?? ""}
                required={status === "finished"}
              />
            </div>
          </div>
          {sameTeam ? (
            <p className="text-sm font-medium text-destructive">
              A seleção mandante e a visitante não podem ser iguais.
            </p>
          ) : null}
          <ActionMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton pendingText="Salvando..." disabled={sameTeam}>
              Salvar alterações
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMatchDialog({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(deleteMatch, initialState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir jogo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este jogo? Esta ação também removerá
            os palpites associados a este jogo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="match_id" value={match.id} />
          <ActionMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              pendingText="Excluindo..."
            >
              Confirmar exclusão
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminMatchesManager({ matches }: { matches: Match[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar jogos</CardTitle>
        <CardDescription>
          Edite os dados das partidas ou exclua jogos e seus palpites associados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-muted-foreground">
            Nenhum jogo cadastrado.
          </p>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 font-semibold">
                  <TeamSummary name={match.home_team} />
                  <span className="text-muted-foreground">x</span>
                  <TeamSummary name={match.away_team} />
                  <Badge variant={match.status === "finished" ? "secondary" : "outline"}>
                    {statusLabel(match.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(match.starts_at)}
                  {match.round ? ` · ${match.round}` : ""}
                  {match.group_name ? ` · ${match.group_name}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <EditMatchDialog match={match} />
                <DeleteMatchDialog match={match} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
