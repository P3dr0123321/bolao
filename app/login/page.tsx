import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <section className="flex flex-col items-center text-center">
          <Image
            src="/times/copa.svg"
            alt="Símbolo da Copa"
            width={160}
            height={160}
            className="h-28 w-28 object-contain sm:h-36 sm:w-36"
            priority
          />

          <div className="relative mt-4 h-14 w-14 overflow-hidden rounded-full border bg-white p-1.5 shadow-md">
            <Image
              src="/Grossi.png"
              alt="Brasão da Família Grossi"
              fill
              className="object-contain p-1"
              sizes="56px"
              priority
            />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bolão Família Grossi
          </h1>
        </section>

        <div className="mt-8 w-full">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
