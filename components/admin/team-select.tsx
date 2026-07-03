"use client";

import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { getTeamByName, TEAMS, type Team } from "@/lib/teams";

export function TeamSelect({
  id,
  name,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  teams = TEAMS
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  teams?: readonly Team[];
}) {
  const selectedTeam = getTeamByName(value);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="h-11 w-full rounded-md bg-background"
          aria-label={placeholder}
        >
          {selectedTeam ? (
            <span className="flex min-w-0 items-center gap-2">
              <Image
                src={selectedTeam.crestUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain"
              />
              <span className="truncate">{selectedTeam.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="max-h-72 bg-background text-foreground"
        >
          {teams.map((team) => (
            <SelectItem key={team.slug} value={team.name}>
              <span className="flex items-center gap-2">
                <Image
                  src={team.crestUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 object-contain"
                />
                <span>{team.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
