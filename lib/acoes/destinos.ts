"use server";

import { refresh } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { refreshTokenDoDestino } from "@/lib/destinos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { revogar } from "@/lib/youtube";

/** Desconecta o canal: revoga o acesso no Google e apaga o destino. */
export async function removerDestino(destinoId: string): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  try {
    await revogar(await refreshTokenDoDestino(destinoId, usuario.id));
  } catch {
    // Se o token já não vale, segue apagando mesmo assim.
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("destinos").delete().eq("id", destinoId);
  if (error) return { erro: "Não foi possível desconectar. Tente de novo." };
  refresh();
  return {};
}
