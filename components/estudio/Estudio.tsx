"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LiveKitRoom } from "@livekit/components-react";
import { DisconnectReason, MediaDeviceFailure, VideoPresets, type RoomOptions } from "livekit-client";
import { SignOut, UserMinus, WarningCircle } from "@phosphor-icons/react";
import { usePreferenciasEntrada } from "@/hooks/usePreferenciasEntrada";
import type { PapelSala } from "@/lib/participante";
import { semCamera } from "@/lib/preferencias";
import { Botao } from "@/components/ui/Botao";
import { Sala } from "@/components/estudio/Sala";

type Props = {
  transmissaoId: string;
  codigo?: string;
  titulo: string;
  papel: PapelSala;
  urlConvite?: string;
  temCanal: boolean;
  temChat: boolean;
  videoYoutube?: string;
  /** "Iniciar" usa a janela de transmissão (repetidor) em vez do Egress. */
  peloNavegador: boolean;
};

type Conexao = { estado: "buscando" } | { estado: "pronta"; token: string } | { estado: "erro"; mensagem: string };
type Saida = "saiu" | "removido" | "caiu";

/** Busca o token no servidor e conecta à sala com as escolhas feitas na pré-entrada. */
export function Estudio(props: Props) {
  const { transmissaoId, codigo, papel } = props;
  const router = useRouter();
  const { preferencias, carregado } = usePreferenciasEntrada();
  const [conexao, setConexao] = useState<Conexao>({ estado: "buscando" });
  const [saida, setSaida] = useState<Saida>();
  const [falhaAparelho, setFalhaAparelho] = useState<MediaDeviceFailure>();

  const urlEntrar = `/t/${transmissaoId}/entrar${codigo ? `?c=${encodeURIComponent(codigo)}` : ""}`;
  const nome = preferencias.nome.trim();

  useEffect(() => {
    if (!carregado) return;
    // Sem nome (ex.: abriu o link direto do estúdio): passa antes pela pré-entrada.
    if (!nome) {
      router.replace(urlEntrar);
      return;
    }
    let cancelado = false;
    void (async () => {
      try {
        const resposta = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transmissaoId,
            codigo,
            nome,
            etiqueta: preferencias.etiqueta,
            modoHost: preferencias.modoHost,
            espelhar: preferencias.espelhar,
          }),
        });
        const dados = (await resposta.json()) as { token?: string; erro?: string };
        if (cancelado) return;
        if (dados.token) setConexao({ estado: "pronta", token: dados.token });
        else setConexao({ estado: "erro", mensagem: dados.erro ?? "Não foi possível entrar na sala." });
      } catch {
        if (!cancelado) setConexao({ estado: "erro", mensagem: "Sem conexão com o servidor. Verifique a internet." });
      }
    })();
    return () => {
      cancelado = true;
    };
    // Busca o token uma vez por entrada; mudar preferências não reconecta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  const opcoesSala = useMemo<RoomOptions>(
    () => ({ adaptiveStream: true, dynacast: true }),
    [],
  );

  if (saida) return <TelaSaida saida={saida} papel={papel} urlEntrar={urlEntrar} />;

  if (conexao.estado === "erro") {
    return (
      <TelaCentral>
        <WarningCircle weight="bold" className="size-10 text-no-ar" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Não deu para entrar</h1>
        <p className="text-texto-suave">{conexao.mensagem}</p>
        <Botao variante="secundario" onClick={() => window.location.reload()}>
          Tentar de novo
        </Botao>
      </TelaCentral>
    );
  }

  if (conexao.estado === "buscando" || !nome) {
    return (
      <TelaCentral>
        <p className="text-texto-suave">Entrando no estúdio…</p>
      </TelaCentral>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={conexao.token}
      connect
      options={opcoesSala}
      audio={{
        deviceId: preferencias.microfoneId || undefined,
        echoCancellation: preferencias.cancelamentoEco,
        noiseSuppression: preferencias.reducaoRuido,
        autoGainControl: true,
      }}
      video={
        semCamera(preferencias, papel)
          ? false
          : { deviceId: preferencias.cameraId || undefined, resolution: VideoPresets[preferencias.resolucao].resolution }
      }
      onDisconnected={(motivo) =>
        setSaida(
          motivo === DisconnectReason.PARTICIPANT_REMOVED
            ? "removido"
            : motivo === DisconnectReason.CLIENT_INITIATED
              ? "saiu"
              : "caiu",
        )
      }
      onMediaDeviceFailure={(falha) => setFalhaAparelho(falha ?? MediaDeviceFailure.Other)}
      onError={(e) => {
        // O LiveKitRoom usa o mesmo onError para falha de câmera/microfone; isso não
        // derruba a sala (vira aviso). Só falha de conexão encerra.
        const falha = MediaDeviceFailure.getFailure(e);
        if (falha) setFalhaAparelho(falha);
        else setConexao({ estado: "erro", mensagem: "A conexão com a sala falhou. Verifique a internet." });
      }}
    >
      <Sala
        {...props}
        soDiretor={papel === "host" && preferencias.modoHost === "diretor"}
        portaoRuido={preferencias.portaoRuido}
        falhaAparelho={falhaAparelho}
        aoFecharAvisoAparelho={() => setFalhaAparelho(undefined)}
        aoSair={() => setSaida("saiu")}
      />
    </LiveKitRoom>
  );
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <section className="flex max-w-md flex-col items-start gap-3">{children}</section>
    </main>
  );
}

function TelaSaida({ saida, papel, urlEntrar }: { saida: Saida; papel: PapelSala; urlEntrar: string }) {
  const textos: Record<Saida, { titulo: string; texto: string }> = {
    saiu: { titulo: "Você saiu do estúdio", texto: "Pode voltar quando quiser pelo mesmo link." },
    removido: { titulo: "Você foi removido da sala", texto: "Quem organizou a transmissão tirou você do estúdio." },
    caiu: { titulo: "A conexão caiu", texto: "Verifique a internet e entre de novo." },
  };
  const { titulo, texto } = textos[saida];
  return (
    <TelaCentral>
      {saida === "removido" ? (
        <UserMinus weight="bold" className="size-10 text-no-ar" aria-hidden />
      ) : (
        <SignOut weight="bold" className="size-10 text-texto-suave" aria-hidden />
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-texto-suave">{texto}</p>
      <div className="flex flex-wrap gap-2">
        {saida !== "removido" && (
          <Link
            href={urlEntrar}
            className="inline-flex min-h-11 items-center rounded-md bg-destaque px-4 font-semibold text-destaque-texto hover:bg-destaque-forte"
          >
            Entrar de novo
          </Link>
        )}
        {papel === "host" && (
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-white/[0.06] px-4 font-semibold ring-1 ring-white/10 ring-inset hover:bg-white/10">
            Voltar para as transmissões
          </Link>
        )}
      </div>
    </TelaCentral>
  );
}
