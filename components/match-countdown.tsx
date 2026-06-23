"use client";

import { useEffect, useRef, useState } from "react";
import { getPredictionDeadline } from "@/lib/utils";

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return "Liberado";
  }

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return `${minutes}min`;
  }

  return `${totalSeconds}s`;
}

export function MatchCountdown({
  startsAt,
  onComplete
}: {
  startsAt: string;
  onComplete?: () => void;
}) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const updateRemaining = () => {
      const milliseconds = getPredictionDeadline(startsAt) - Date.now();
      setRemaining(formatRemaining(milliseconds));

      if (milliseconds <= 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(interval);
  }, [startsAt]);

  return <span>{remaining ?? "Calculando..."}</span>;
}
