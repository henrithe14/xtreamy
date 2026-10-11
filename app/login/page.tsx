import type { Metadata } from "next";
import { Marca } from "@/components/ui/Marca";
import { FormLogin } from "@/components/login/FormLogin";

export const metadata: Metadata = { title: "Entrar · Estúdio" };

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Marca className="mb-10" />
        <h1 className="fonte-larga mb-2 text-3xl font-extrabold">Entre para dirigir suas lives</h1>
        <p className="mb-8 text-texto-suave">
          Convidados não precisam de conta: entram direto pelo link de convite.
        </p>
        <FormLogin />
      </div>
    </main>
  );
}
