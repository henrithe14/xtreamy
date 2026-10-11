"use client";

import { useEffect, type ReactNode } from "react";
import { useMediaDeviceSelect } from "@livekit/components-react";
import type { LocalAudioTrack, LocalVideoTrack } from "livekit-client";
import { Selecao } from "@/components/ui/Selecao";

type Props = {
  id: string;
  tipo: "audioinput" | "videoinput" | "audiooutput";
  rotulo: string;
  icone: ReactNode;
  /** Faixa de prévia: trocar o aparelho troca a fonte da faixa, sem recriá-la. */
  faixa?: LocalAudioTrack | LocalVideoTrack;
  /** Libera os nomes dos aparelhos (depois que a permissão já foi dada). */
  liberado: boolean;
  valor: string;
  aoMudar: (id: string) => void;
  desativado?: boolean;
};

const NOME_GENERICO: Record<Props["tipo"], string> = {
  audioinput: "Microfone",
  videoinput: "Câmera",
  audiooutput: "Alto-falante",
};

export function SeletorAparelho({ id, tipo, rotulo, icone, faixa, liberado, valor, aoMudar, desativado }: Props) {
  const { devices, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: tipo,
    track: faixa,
    requestPermissions: liberado,
  });

  // Quando a faixa nasce, registra qual aparelho o navegador realmente usou.
  useEffect(() => {
    if (!faixa) return;
    let cancelado = false;
    void faixa.getDeviceId(false).then((real) => {
      if (!cancelado && real) aoMudar(real);
    });
    return () => {
      cancelado = true;
    };
  }, [faixa, aoMudar]);

  async function trocar(novoId: string) {
    aoMudar(novoId);
    if (faixa) await setActiveMediaDevice(novoId);
  }

  const aparelhos = devices.filter((d) => d.deviceId);
  const valorNaLista = aparelhos.some((d) => d.deviceId === valor) ? valor : (aparelhos[0]?.deviceId ?? "");

  return (
    <Selecao
      id={id}
      rotulo={rotulo}
      icone={icone}
      value={valorNaLista}
      onChange={(e) => void trocar(e.target.value)}
      disabled={desativado || aparelhos.length === 0}
    >
      {aparelhos.length === 0 && <option value="">Nenhum encontrado</option>}
      {aparelhos.map((d, i) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label || `${NOME_GENERICO[tipo]} ${i + 1}`}
        </option>
      ))}
    </Selecao>
  );
}
