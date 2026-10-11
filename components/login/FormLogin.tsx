"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "@/lib/acoes/auth";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto, MensagemErro } from "@/components/ui/Campo";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      <CampoTexto
        id="email"
        name="email"
        type="email"
        rotulo="E-mail"
        autoComplete="email"
        required
        defaultValue={estado.email}
      />
      <CampoTexto
        id="senha"
        name="senha"
        type="password"
        rotulo="Senha"
        autoComplete="current-password"
        required
      />
      <MensagemErro>{estado.erro}</MensagemErro>
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
