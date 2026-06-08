import Link from "next/link";
import Image from "next/image";
import { LogOut, Shield } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

export function Header({ participant }: { participant: Participant }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
            <Image
              src="/Grossi.png"
              alt="Brasão da Família Grossi"
              fill
              className="object-contain p-1"
              sizes="44px"
              priority
            />
          </span>
          <span className="hidden sm:inline">Bolão Família Grossi</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Início</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/jogos">Jogos</Link>
          </Button>
          {participant.role === "admin" ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          ) : null}
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
