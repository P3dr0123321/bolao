"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { getAllFinalPredictions } from "@/app/actions/final-predictions";
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
import type { FinalPredictionWithParticipant } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamBadge({ name }: { name: string }) {
  const crest = getTeamCrestUrl(name);

  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 font-medium">
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

export function FinalPredictionsDialog({
  canViewAll
}: {
  canViewAll: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<
    FinalPredictionWithParticipant[] | null
  >(null);

  const loadPredictions = useCallback(async () => {
    if (!canViewAll || loading || predictions) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await getAllFinalPredictions();

      if (result.ok) {
        setPredictions(result.predictions);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Não foi possível carregar os palpites da final.");
    } finally {
      setLoading(false);
    }
  }, [canViewAll, loading, predictions]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      void loadPredictions();
    }
  };

  if (!canViewAll) {
    return (
      <Button type="button" variant="outline" disabled>
        Ver palpites da final
      </Button>
    );
  }

  const predictionCount = predictions?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Ver palpites da final
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-background sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Palpites da Final</DialogTitle>
          <DialogDescription>
            Finalistas e campeão escolhidos pela família
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="rounded-lg border p-6 text-center text-muted-foreground">
            Carregando palpites da final...
          </p>
        ) : errorMessage ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              {predictionCount}{" "}
              {predictionCount === 1
                ? "palpite registrado"
                : "palpites registrados"}
            </p>

            {predictionCount === 0 ? (
              <p className="rounded-lg border p-6 text-center text-muted-foreground">
                Nenhum palpite da final registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {predictions?.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

                      <div className="flex flex-wrap items-center gap-2">
                        <TeamBadge name={prediction.finalist_one} />
                        <span className="text-muted-foreground">x</span>
                        <TeamBadge name={prediction.finalist_two} />
                        <span className="text-muted-foreground">Campeão:</span>
                        <TeamBadge name={prediction.winner} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
