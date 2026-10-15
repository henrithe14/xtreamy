"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  Microphone,
  SpeakerHigh,
  VideoCamera,
  VideoCameraSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { useFaixasPrevia, type ErroMidia } from "@/hooks/useFaixasPrevia";
import { useNivelAudio } from "@/hooks/useNivelAudio";
import { usePreferenciasEntrada } from "@/hooks/usePreferenciasEntrada";
import { LIMITES_IDENTIDADE, semCamera, type Preferencias, type Resolucao } from "@/lib/preferencias";
import type { ModoHost } from "@/lib/participante";
import { desbloquearAudio, suportaEscolherSaida } from "@/lib/som";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto, MensagemErro } from "@/components/ui/Campo";
import { Interruptor, Selecao } from "@/components/ui/Selecao";
import { MedidorNivel } from "@/components/entrar/MedidorNivel";
import { PreviaCamera } from "@/components/entrar/PreviaCamera";
import { SeletorAparelho } from "@/components/entrar/SeletorAparelho";
import { TestarSom } from "@/components/entrar/TestarSom";

type Props = { transmissaoId: string; codigo?: string; titulo: string; papel: "host" | "convidado" };

const RESOLUCOES: { valor: Resolucao; rotulo: string }[] = [
  { valor: "h540", rotulo: "540p (rede fraca)" },
  { valor: "h720", rotulo: "720p (recomendado)" },
  { valor: "h1080", rotulo: "1080p (rede boa)" },
];

/** Pré-entrada: só espera ler as preferências salvas antes de ligar a câmera. */
export function PreEntrada(props: Props) {
  const { preferencias, atualizar, carregado } = usePreferenciasEntrada();
  // Remontar com outra key cria as faixas do zero ("Tentar de novo").
  const [tentativa, setTentativa] = useState(0);

  if (!carregado) {
    return <p className="text-texto-suave">Carregando…</p>;
  }
  return (
    <Conteudo
      key={tentativa}
      {...props}
      preferencias={preferencias}
      atualizar={atualizar}
      tentarDeNovo={() => setTentativa((t) => t + 1)}
    />
  );
}

type PropsConteudo = Props & {
  preferencias: Preferencias;
  atualizar: <K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) => void;
  tentarDeNovo: () => void;
};

function Conteudo({ transmissaoId, codigo, titulo, papel, preferencias, atualizar, tentarDeNovo }: PropsConteudo) {
  const router = useRouter();
  // Aparelhos salvos valem só para criar as faixas; trocas depois vão direto na faixa.
  const [idsIniciais] = useState({ camera: preferencias.cameraId, microfone: preferencias.microfoneId });
  const [entrando, setEntrando] = useState(false);
  const [erroNome, setErroNome] = useState<string>();

  const semCam = semCamera(preferencias, papel);
  const soDiretor = papel === "host" && preferencias.modoHost === "diretor";
  const { video, audio, erro } = useFaixasPrevia({ ...preferencias, soVoz: semCam }, !entrando, idsIniciais);
  const nivel = useNivelAudio(audio);
  const carregando = !erro && !audio && !entrando;
  const permitido = Boolean(audio);

  const mudarCamera = useCallback((id: string) => atualizar("cameraId", id), [atualizar]);
  const mudarMicrofone = useCallback((id: string) => atualizar("microfoneId", id), [atualizar]);
  const mudarAltoFalante = useCallback((id: string) => atualizar("altoFalanteId", id), [atualizar]);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    if (!preferencias.nome.trim()) {
      setErroNome("Escreva seu nome: ele aparece na live.");
      return;
    }
    await desbloquearAudio();
    // Solta câmera e microfone da prévia; a sala liga de novo com as mesmas escolhas.
    setEntrando(true);
    const destino = `/t/${transmissaoId}/estudio${codigo ? `?c=${encodeURIComponent(codigo)}` : ""}`;
    router.push(destino);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4">
        <PreviaCamera
          video={video}
          carregando={carregando}
          nome={preferencias.nome.trim()}
          etiqueta={preferencias.etiqueta.trim()}
          falando={nivel > 0.25}
          espelhar={preferencias.espelhar}
        />
        {erro && (
          <AvisoErro
            erro={erro}
            aoTentar={tentarDeNovo}
            aoSoVoz={() => {
              atualizar("soVoz", true);
              tentarDeNovo();
            }}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!soDiretor && (
            <Botao variante="secundario" onClick={() => atualizar("soVoz", !preferencias.soVoz)}>
              {preferencias.soVoz ? (
                <VideoCamera weight="bold" aria-hidden />
              ) : (
                <VideoCameraSlash weight="bold" aria-hidden />
              )}
              {preferencias.soVoz ? "Ligar câmera" : "Entrar só com voz"}
            </Botao>
          )}
          <p className="flex items-center gap-2 text-sm text-texto-suave">
            <Headphones weight="bold" className="size-5 shrink-0" aria-hidden />
            Use fones para evitar eco.
          </p>
        </div>
      </div>

      <form onSubmit={entrar} className="vidro flex flex-col gap-5 rounded-xl p-5 sm:p-6" noValidate>
        <div>
          <p className="text-sm text-texto-suave">
            {papel === "host" ? "Você vai dirigir" : "Você foi convidado para"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{titulo}</h1>
        </div>

        {papel === "host" && (
          <EscolhaModo modo={preferencias.modoHost} aoMudar={(m) => atualizar("modoHost", m)} />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <CampoTexto
            id="nome"
            rotulo="Nome"
            required
            maxLength={LIMITES_IDENTIDADE.nome}
            autoComplete="name"
            value={preferencias.nome}
            onChange={(e) => {
              atualizar("nome", e.target.value);
              setErroNome(undefined);
            }}
            aria-invalid={Boolean(erroNome)}
          />
          <CampoTexto
            id="etiqueta"
            rotulo="Etiqueta (opcional)"
            maxLength={LIMITES_IDENTIDADE.etiqueta}
            placeholder="Comentarista, @usuario…"
            value={preferencias.etiqueta}
            onChange={(e) => atualizar("etiqueta", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <SeletorAparelho
            id="microfone"
            tipo="audioinput"
            rotulo="Microfone"
            icone={<Microphone weight="bold" />}
            faixa={audio}
            liberado={permitido}
            valor={preferencias.microfoneId}
            aoMudar={mudarMicrofone}
          />
          <MedidorNivel nivel={nivel} ativo={Boolean(audio)} />
          <p className="text-xs text-texto-suave">Fale algo: as barras devem se mexer.</p>
        </div>

        <div className="flex flex-col gap-2">
          {suportaEscolherSaida() ? (
            <SeletorAparelho
              id="alto-falante"
              tipo="audiooutput"
              rotulo="Alto-falante"
              icone={<SpeakerHigh weight="bold" />}
              liberado={permitido}
              valor={preferencias.altoFalanteId}
              aoMudar={mudarAltoFalante}
            />
          ) : (
            <p className="text-sm text-texto-suave">O som sai pelo alto-falante ou fone deste aparelho.</p>
          )}
          <TestarSom altoFalanteId={preferencias.altoFalanteId} />
        </div>

        {!semCam && (
          <SeletorAparelho
            id="camera"
            tipo="videoinput"
            rotulo="Câmera"
            icone={<VideoCamera weight="bold" />}
            faixa={video}
            liberado={permitido}
            valor={preferencias.cameraId}
            aoMudar={mudarCamera}
          />
        )}

        <details className="group rounded-md border border-white/10 px-4 py-3">
          <summary className="cursor-pointer font-medium">Configurações</summary>
          <div className="mt-4 flex flex-col gap-4">
            <Selecao
              id="resolucao"
              rotulo="Qualidade da câmera"
              value={preferencias.resolucao}
              onChange={(e) => atualizar("resolucao", e.target.value as Resolucao)}
              disabled={semCam}
            >
              {RESOLUCOES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.rotulo}
                </option>
              ))}
            </Selecao>
            {!semCam && (
              <Interruptor
                id="espelhar"
                rotulo="Espelhar câmera"
                dica="Vale também para a live: textos na imagem aparecem invertidos. A prévia mostra como vai ao ar."
                ligado={preferencias.espelhar}
                aoMudar={(v) => atualizar("espelhar", v)}
              />
            )}
            <Interruptor
              id="eco"
              rotulo="Cancelamento de eco"
              dica="Evita que sua voz volte pelo alto-falante."
              ligado={preferencias.cancelamentoEco}
              aoMudar={(v) => atualizar("cancelamentoEco", v)}
            />
            <Interruptor
              id="ruido"
              rotulo="Redução de ruído"
              dica="Abafa barulhos de fundo, como ventilador e teclado."
              ligado={preferencias.reducaoRuido}
              aoMudar={(v) => atualizar("reducaoRuido", v)}
            />
            <Interruptor
              id="portao"
              rotulo="Só transmitir quando eu falar"
              dica="Com o microfone aberto e você calado, nada é transmitido (nem respiração, nem barulho de fundo)."
              ligado={preferencias.portaoRuido}
              aoMudar={(v) => atualizar("portaoRuido", v)}
            />
          </div>
        </details>

        <MensagemErro>{erroNome}</MensagemErro>
        <Botao type="submit" className="min-h-13 text-lg" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar no estúdio"}
        </Botao>
      </form>
    </div>
  );
}

const MODOS: { valor: ModoHost; rotulo: string; dica: string }[] = [
  { valor: "apresentador", rotulo: "Diretor e apresentador", dica: "Com câmera e microfone; você pode aparecer na live." },
  { valor: "diretor", rotulo: "Só diretor", dica: "Controla tudo sem aparecer. O microfone fica só para a equipe." },
];

function EscolhaModo({ modo, aoMudar }: { modo: ModoHost; aoMudar: (m: ModoHost) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">Como você vai participar?</legend>
      {MODOS.map((m) => (
        <label
          key={m.valor}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 px-3 py-2.5 has-[:checked]:border-destaque has-[:checked]:bg-destaque/10"
        >
          <input
            type="radio"
            name="modo-host"
            value={m.valor}
            checked={modo === m.valor}
            onChange={() => aoMudar(m.valor)}
            className="mt-1 accent-destaque"
          />
          <span>
            <span className="block font-medium">{m.rotulo}</span>
            <span className="block text-sm text-texto-suave">{m.dica}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

const TEXTO_ERRO: Record<ErroMidia, string> = {
  permissao:
    "O navegador bloqueou a câmera e o microfone. Toque no cadeado ao lado do endereço, permita o acesso e tente de novo.",
  "sem-aparelho": "Não encontramos uma câmera ou um microfone neste aparelho.",
  "em-uso": "A câmera ou o microfone está sendo usado por outro programa. Feche-o e tente de novo.",
  outro: "Não foi possível ligar a câmera e o microfone.",
};

function AvisoErro({ erro, aoTentar, aoSoVoz }: { erro: ErroMidia; aoTentar: () => void; aoSoVoz: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl bg-no-ar/10 px-4 py-3 ring-1 ring-no-ar/20 ring-inset">
      <p className="flex items-start gap-3 text-no-ar">
        <WarningCircle weight="bold" className="mt-0.5 size-5 shrink-0" aria-hidden />
        {TEXTO_ERRO[erro]}
      </p>
      <div className="flex flex-wrap gap-2">
        <Botao variante="secundario" onClick={aoTentar}>
          Tentar de novo
        </Botao>
        {erro !== "permissao" && (
          <Botao variante="fantasma" onClick={aoSoVoz}>
            Entrar só com voz
          </Botao>
        )}
      </div>
    </div>
  );
}
