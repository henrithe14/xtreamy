"use client";

import { useEffect, useRef } from "react";
import { useDataChannel, useSpeakingParticipants } from "@livekit/components-react";
import { FATOR_DUCKING, posicaoMusica, type Cena, type Musica } from "@/lib/cena";
import { lerEfeito, tentarTocar, tocarEfeito, TOPICO_EFEITO } from "@/lib/audioLive";
import { ATRIBUTO_AUDIO_PRIVADO, ATRIBUTO_DIRETOR, lerMetadados } from "@/lib/participante";
import { AudioPalco, usePalcoVisivel, type SaidaLocal } from "@/components/stage/Composicao";
import { conectarElemento, origemMix } from "@/lib/mixGravacao";

/**
 * Tudo o que se ouve na live (seção 8.5): vozes do palco, música de fundo com ducking
 * e efeitos sonoros. Fica no /stage e, no estúdio, quando o diretor liga "Ouvir a live".
 * O som de mídias e vinhetas sai da própria Composicao (comSom).
 */
export function AudioLive({ cena, saida = "tudo" }: { cena: Cena; saida?: SaidaLocal }) {
  return (
    <>
      <AudioPalco cena={cena} saida={saida} />
      <TrilhaNaSala cena={cena} />
    </>
  );
}

/**
 * Música de fundo (com ducking) e efeitos sonoros. Na live, junto com as vozes; no
 * estúdio, para toda a equipe ouvir o que está tocando (sem precisar de "Ouvir a live").
 */
export function TrilhaNaSala({ cena }: { cena: Cena }) {
  const abaixar = useAbaixarMusica(cena);

  // Efeitos: só pedidos de quem dirige (papel e direção são gravados pelo servidor).
  useDataChannel(TOPICO_EFEITO, (msg) => {
    const de = msg.from;
    if (!de || (lerMetadados(de.metadata).papel !== "host" && de.attributes[ATRIBUTO_DIRETOR] !== "1")) return;
    const pedido = lerEfeito(msg.payload);
    if (pedido) tocarEfeito(pedido);
  });

  return cena.musica ? <MusicaFundo musica={cena.musica} silenciar={cena.status === "encerrada"} abaixar={abaixar} /> : null;
}

/**
 * A música baixa quando alguém ouvido na live fala (no palco, fora do intervalo, sem
 * "mudo para a live"), e também durante vinhetas e mídias com som que não são de loop.
 */
function useAbaixarMusica(cena: Cena): boolean {
  const palco = usePalcoVisivel(cena);
  const falando = useSpeakingParticipants();
  const vozesNoAr = cena.status !== "intervalo" && cena.status !== "encerrada";
  const ids = new Set(palco.map((p) => p.identity));
  const voz = vozesNoAr && falando.some((p) => ids.has(p.identity) && p.attributes[ATRIBUTO_AUDIO_PRIVADO] !== "1");
  const midiaComSom = cena.vinheta !== null || (cena.midia !== null && cena.midia.video && !cena.midia.loop);
  return voz || midiaComSom;
}

function MusicaFundo({ musica, silenciar, abaixar }: { musica: Musica; silenciar: boolean; abaixar: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const atual = useRef(musica);
  useEffect(() => {
    atual.current = musica;
  }, [musica]);

  // Janela de gravação: a música vai só para o arquivo.
  useEffect(() => {
    if (ref.current) conectarElemento(ref.current);
  }, []);

  const chaveFaixas = musica.faixas.map((f) => f.url).join("|");
  const parada = musica.pausadaEm !== null || silenciar;

  // Faixa e posição: recalculadas quando a playlist, o início ou a pausa mudam.
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (parada) {
      audio.pause();
      return;
    }
    let indiceAtual = 0;
    let pendente: (() => void) | null = null;

    const tocar = (indice: number, offsetSeg: number) => {
      const { faixas } = atual.current;
      indiceAtual = indice;
      const url = faixas[indice].url;
      const posicionar = () => {
        pendente = null;
        audio.currentTime = offsetSeg;
        tentarTocar(audio);
      };
      if (audio.dataset.url !== url) {
        audio.dataset.url = url;
        audio.src = url;
      }
      if (audio.readyState >= 1) posicionar();
      else {
        if (pendente) audio.removeEventListener("loadedmetadata", pendente);
        pendente = posicionar;
        audio.addEventListener("loadedmetadata", posicionar, { once: true });
      }
    };

    const { indice, offsetSeg } = posicaoMusica(atual.current, Date.now());
    tocar(indice, offsetSeg);

    // Ao acabar a faixa, segue para a próxima (a playlist roda em loop).
    const aoAcabar = () => tocar((indiceAtual + 1) % atual.current.faixas.length, 0);
    audio.addEventListener("ended", aoAcabar);
    return () => {
      audio.removeEventListener("ended", aoAcabar);
      if (pendente) audio.removeEventListener("loadedmetadata", pendente);
    };
  }, [chaveFaixas, musica.inicioEm, parada]);

  // Volume com ducking: desce rápido quando alguém fala e volta devagar depois.
  const abaixadaAntes = useRef<boolean | null>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const alvo = musica.volume * (abaixar ? FATOR_DUCKING[musica.ducking] : 1);
    if (abaixadaAntes.current === null) {
      audio.volume = alvo; // primeira vez: sem rampa
      abaixadaAntes.current = abaixar;
      return;
    }
    const voltando = abaixadaAntes.current && !abaixar;
    abaixadaAntes.current = abaixar;
    const duracao = abaixar ? 200 : voltando ? 900 : 150;
    const espera = voltando ? 600 : 0;

    // setInterval em vez de requestAnimationFrame: continua com a aba em segundo plano.
    let intervalo: number | undefined;
    const atraso = window.setTimeout(() => {
      const de = audio.volume;
      const inicio = performance.now();
      intervalo = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - inicio) / duracao);
        audio.volume = de + (alvo - de) * k;
        if (k >= 1) window.clearInterval(intervalo);
      }, 30);
    }, espera);
    return () => {
      window.clearTimeout(atraso);
      window.clearInterval(intervalo);
    };
  }, [abaixar, musica.volume, musica.ducking]);

  return <audio ref={ref} preload="auto" crossOrigin={origemMix()} hidden />;
}
