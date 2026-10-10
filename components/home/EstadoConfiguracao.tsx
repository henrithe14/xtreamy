import { connection } from "next/server";
import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react/ssr";
import { verificarSupabase, type EstadoSupabase } from "@/lib/saude";

const ESTADOS: Record<EstadoSupabase, { texto: string; cor: string; Icone: typeof CheckCircle }> = {
  ok: { texto: "Supabase conectado", cor: "text-pronto", Icone: CheckCircle },
  nao_configurado: {
    texto: "Supabase ainda não configurado — preencha o .env.local",
    cor: "text-ensaio",
    Icone: WarningCircle,
  },
  erro: { texto: "Supabase não respondeu — confira a URL e a chave", cor: "text-no-ar", Icone: XCircle },
};

export async function EstadoConfiguracao() {
  await connection();
  const { texto, cor, Icone } = ESTADOS[await verificarSupabase()];

  return (
    <li className={`flex items-center gap-3 ${cor}`}>
      <Icone weight="fill" className="size-5 shrink-0" aria-hidden />
      {texto}
    </li>
  );
}
