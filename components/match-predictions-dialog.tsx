"use client";

import Image from "next/image";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { getTeamCrestUrl } from "@/lib/teams";
import type { Match, PredictionWithParticipant } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamCrest({ name }: { name: string }) {
  const crest = getTeamCrestUrl(name);

  if (!crest) {
    return null;
  }

  return (
    <Image
      src={crest}
      alt={`Escudo de ${name}`}
      width={28}
      height={28}
      className="h-7 w-7 object-contain"
    />
  );
}

export function MatchPredictionsDialog({
  match,
  predictions
}: {
  match: Match;
  predictions: PredictionWithParticipant[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Ver palpites
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Palpites</DialogTitle>
          <DialogDescription>
            {match.home_team} x {match.away_team}
          </DialogDescription>
        </DialogHeader>

        {predictions.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-muted-foreground">
            Nenhum palpite registrado para este jogo ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <div
                key={prediction.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage
                      src={prediction.participant.avatar_url ?? undefined}
                      alt={prediction.participant.full_name}
                    />
                    <AvatarFallback>
                      {getInitials(prediction.participant.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {prediction.participant.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{prediction.participant.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 font-bold">
                    <TeamCrest name={match.home_team} />
                    <span>{prediction.predicted_home_score}</span>
                    <span className="text-muted-foreground">x</span>
                    <span>{prediction.predicted_away_score}</span>
                    <TeamCrest name={match.away_team} />
                  </div>
                  {match.status === "finished" ? (
                    <span className="whitespace-nowrap text-sm font-semibold text-primary">
                      {prediction.points_awarded} pontos
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
