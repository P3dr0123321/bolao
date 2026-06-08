"use client";

import Image from "next/image";
import { useFormState } from "react-dom";
import { uploadFamilyPhoto } from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState, FamilyPhoto } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

export function AdminFamilyPhotosManager({ photos }: { photos: FamilyPhoto[] }) {
  const [state, formAction] = useFormState(uploadFamilyPhoto, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos do carrossel</CardTitle>
        <CardDescription>Envie até 3 fotos para a capa do Bolão.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {photos.length === 0 ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground sm:col-span-3">
              Nenhuma foto enviada ainda.
            </p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-lg border bg-background">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={photo.image_url}
                    alt={photo.title ?? "Foto da família"}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
                <p className="p-3 text-sm font-medium">{photo.title ?? "Sem título"}</p>
              </div>
            ))
          )}
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image">Foto</Label>
              <Input id="image" name="image" type="file" accept="image/*" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Ordem</Label>
              <Input id="sort_order" name="sort_order" type="number" defaultValue={0} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" />
            </div>
          </div>
          <SubmitButton pendingText="Enviando...">Adicionar foto</SubmitButton>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
