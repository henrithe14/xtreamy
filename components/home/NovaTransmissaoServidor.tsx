import { exigirUsuario } from "@/lib/auth";
import { listarDestinos } from "@/lib/destinos";
import { NovaTransmissao, type OpcaoDestino } from "@/components/home/NovaTransmissao";

/** Busca os canais conectados (sem tokens) e entrega ao formulário. */
export async function NovaTransmissaoServidor() {
  await exigirUsuario();
  let destinos: OpcaoDestino[] = [];
  try {
    destinos = (await listarDestinos()).map((d) => ({ id: d.id, nome: d.nome_canal }));
  } catch {
    // Sem destinos disponíveis: o formulário oferece conectar em Destinos.
  }
  return <NovaTransmissao destinos={destinos} />;
}
