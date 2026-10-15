import "server-only";
import { CENA_INICIAL, validarCena, type Cena } from "@/lib/cena";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Último visual do criador: guardado a cada mudança de cena e usado para começar a
// cena de uma sala vazia (transmissão nova ou estúdio aberto de novo).
// Pessoas no palco, banner, mídias, música e status nunca são guardados.

const PARTES = ["layoutId", "tamanhoSolo", "posicaoCameras", "cores", "estilo", "logo", "overlay", "fundo"] as const;
type Visual = Pick<Cena, (typeof PARTES)[number]>;

function extrair(cena: Cena): Visual {
  return Object.fromEntries(PARTES.map((k) => [k, cena[k]])) as Visual;
}

/** Guarda o visual (sem travar a cena se a tabela ainda não existir). */
export async function salvarVisual(donoId: string, cena: Cena) {
  try {
    await criarClienteAdmin()
      .from("cena_salva")
      .upsert({ user_id: donoId, definicao: extrair(cena), atualizado_em: new Date().toISOString() });
  } catch {
    // Falta rodar o SQL: segue sem lembrar.
  }
}

/** Cena inicial com o último visual do criador (ou a padrão). */
export async function cenaInicialDoDono(donoId: string): Promise<Cena> {
  try {
    const { data } = await criarClienteAdmin().from("cena_salva").select("definicao").eq("user_id", donoId).maybeSingle();
    if (!data?.definicao || typeof data.definicao !== "object") return CENA_INICIAL;
    // Valida como uma cena completa: URL fora do bucket, layout que não existe etc. caem no padrão.
    return validarCena({ ...CENA_INICIAL, ...(data.definicao as Partial<Visual>) }) ?? CENA_INICIAL;
  } catch {
    return CENA_INICIAL;
  }
}
