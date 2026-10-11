import type { Metadata } from "next";
import { Marca } from "@/components/ui/Marca";
import { FormLogin } from "@/components/login/FormLogin";

export const metadata: Metadata = { title: "Entrar · Xtreamy" };

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Marca />
      <section className="vidro w-full max-w-sm rounded-xl p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Entrar</h1>
        <p className="mb-6 text-sm text-texto-suave">Acesse suas transmissões e o estúdio.</p>
        <FormLogin />
      </section>
      <p className="max-w-sm text-center text-sm text-texto-suave">
        Foi convidado para uma live? Entre pelo link que você recebeu, sem precisar de conta.
      </p>
    </main>
  );
}
