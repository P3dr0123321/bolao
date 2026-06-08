import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Participant } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LeaderboardTable({
  participants,
}: {
  participants: Participant[];
}) {
  if (participants.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Nenhum participante cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Posição</TableHead>
            <TableHead>Participante</TableHead>
            <TableHead className="text-right">Pontos</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {participants.map((participant, index) => (
            <TableRow key={participant.id}>
              <TableCell className="font-semibold">#{index + 1}</TableCell>

              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage
                      src={participant.avatar_url ?? undefined}
                      alt={participant.full_name}
                    />
                    <AvatarFallback>
                      {getInitials(participant.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">{participant.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{participant.username}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-right text-lg font-bold">
                {participant.total_points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
