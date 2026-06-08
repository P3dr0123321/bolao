"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FamilyPhoto } from "@/lib/types";

const placeholders = [
  "Almoço de domingo",
  "Torcida reunida",
  "Dia de festa"
];

export function FamilyCarousel({ photos }: { photos: FamilyPhoto[] }) {
  const slides = useMemo(
    () =>
      photos.length > 0
        ? photos.slice(0, 3)
        : placeholders.map((title, index) => ({
            id: String(index),
            image_url: "",
            title,
            sort_order: index,
            created_at: ""
          })),
    [photos]
  );
  const [active, setActive] = useState(0);
  const current = slides[active];

  function move(direction: -1 | 1) {
    setActive((value) => (value + direction + slides.length) % slides.length);
  }

  return (
    <section className="relative h-[320px] overflow-hidden bg-primary text-primary-foreground md:h-[420px] lg:h-[560px] xl:h-[620px]">
      {current.image_url ? (
        <Image
          src={current.image_url}
          alt={current.title ?? "Foto da família"}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 hero-pattern" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/24 to-black/10" />
      <div className="container relative flex h-full flex-col justify-end pb-8 pt-20 md:pb-10 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm backdrop-blur">
            <Images className="h-4 w-4" />
            Família Grossi
          </div>
          <h1 className="text-4xl font-bold tracking-normal md:text-6xl">
            Bolão Família Grossi
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/88 md:text-lg">
            {current.title ?? "Palpites, placares e a disputa familiar da Copa."}
          </p>
        </div>
        <div className="mt-8 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Foto anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`h-2.5 rounded-full transition-all ${
                  index === active ? "w-8 bg-white" : "w-2.5 bg-white/45"
                }`}
                aria-label={`Ir para foto ${index + 1}`}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Próxima foto"
            onClick={() => move(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
