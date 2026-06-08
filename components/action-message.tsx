"use client";

import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-sm font-medium",
        state.ok ? "text-primary" : "text-destructive"
      )}
    >
      {state.message}
    </p>
  );
}
