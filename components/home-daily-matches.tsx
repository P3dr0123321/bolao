import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/card";
import { getTeamCrestUrl } from "@/lib/teams";
import type { Match } from "@/lib/types";
import { formatKickoff } from "@/lib/utils";

function statusLabel(status: Match["status"]) {
  if (status === "finished") return "Finalizado";
  if (status === "live") return "Ao vivo";
  return "Agendado";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamDisplay({ name }: { name: string }) {
  const crest = getTeamCrestUrl(name);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      {crest ? (
        <Image
          src={crest}
          alt={`Escudo de ${name}`}
          width={64}
          height={64}
          className="h-14 w-14 object-contain sm:h-16 sm:w-16"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground sm:h-16 sm:w-16">
          {initials(name)}
        </div>
      )}
      <p className="w-full truncate font-semibold">{name}</p>
    </div>
  );
}

export function HomeDailyMatches({ matches }: { matches: Match[] }) {
  return (
    <section className="container pt-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Partidas
        </p>
        <h2 className="text-3xl font-bold tracking-normal">Jogos de hoje</h2>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-sm">
          Não há jogos agendados para hoje.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <Card key={match.id} className="justify-between shadow-sm">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {match.round ?? "Partida"}
                  {match.group_name ? ` · ${match.group_name}` : ""}
                </div>
                <Badge variant={match.status === "finished" ? "secondary" : "default"}>
                  {statusLabel(match.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <TeamDisplay name={match.home_team} />
                  <span className="text-2xl font-black text-muted-foreground">X</span>
                  <TeamDisplay name={match.away_team} />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatKickoff(match.starts_at)}</p>
                  {match.status === "finished" ? (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Placar final: {match.home_score} x {match.away_score}
                    </p>
                  ) : null}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/jogos">Fazer palpite</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
