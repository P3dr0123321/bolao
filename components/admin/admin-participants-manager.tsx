"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteParticipant,
  updateParticipant
} from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { ActionState, Participant, ParticipantRole } from "@/lib/types";

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

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(new Date(createdAt));
}

function EditParticipantDialog({ participant }: { participant: Participant }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<ParticipantRole>(participant.role);
  const [state, formAction] = useFormState(updateParticipant, initialState);

  useEffect(() => {
    if (open) {
      setRole(participant.role);
    }
  }, [open, participant.role]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="border bg-background shadow-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar participante</DialogTitle>
          <DialogDescription>
            Atualize o perfil e, se necessário, as credenciais de acesso.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="participant_id" value={participant.id} />
          <input type="hidden" name="role" value={role} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${participant.id}-full-name`}>Nome completo</Label>
              <Input
                id={`${participant.id}-full-name`}
                name="full_name"
                defaultValue={participant.full_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${participant.id}-username`}>Usuário</Label>
              <Input
                id={`${participant.id}-username`}
                name="username"
                defaultValue={participant.username}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${participant.id}-role`}>Perfil</Label>
              <Select value={role} onValueChange={(value) => setRole(value as ParticipantRole)}>
                <SelectTrigger id={`${participant.id}-role`} className="h-10 w-full rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participante</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${participant.id}-password`}>Nova senha</Label>
              <Input
                id={`${participant.id}-password`}
                name="password"
                type="password"
                minLength={6}
                placeholder="Deixe vazio para manter"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${participant.id}-avatar`}>Novo avatar</Label>
              <Input
                id={`${participant.id}-avatar`}
                name="avatar"
                type="file"
                accept="image/*"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para manter o avatar atual.
              </p>
            </div>
          </div>
          <ActionMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton pendingText="Salvando...">Salvar alterações</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteParticipantDialog({ participant }: { participant: Participant }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(deleteParticipant, initialState);

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
          <DialogTitle>Excluir participante</DialogTitle>
          <DialogDescription>
            Confirme a exclusão de {participant.full_name}. O login e todos os
            palpites desta pessoa também serão excluídos.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="participant_id" value={participant.id} />
          <ActionMessage state={state} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton className="bg-destructive text-destructive-foreground hover:bg-destructive/80" pendingText="Excluindo...">
              Confirmar exclusão
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminParticipantsManager({
  participants
}: {
  participants: Participant[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Participantes</CardTitle>
        <CardDescription>
          Edite perfis, credenciais e permissões ou exclua participantes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="rounded-lg border p-8 text-center text-muted-foreground">
            Nenhum participante cadastrado.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={participant.avatar_url ?? undefined}
                            alt={participant.full_name}
                          />
                          <AvatarFallback>{getInitials(participant.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            @{participant.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={participant.role === "admin" ? "default" : "secondary"}>
                        {participant.role === "admin" ? "Admin" : "Participante"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {participant.total_points}
                    </TableCell>
                    <TableCell>{formatCreatedAt(participant.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <EditParticipantDialog participant={participant} />
                        <DeleteParticipantDialog participant={participant} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
