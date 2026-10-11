"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { criarTransmissao, type EstadoNovaTransmissao } from "@/lib/acoes/transmissoes";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, CampoTexto, MensagemErro } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { Interruptor } from "@/components/ui/Selecao";

const OPCOES_PRIVACIDADE = [
  { valor: "nao_listada", rotulo: "Não listada", dica: "Só quem tem o link do YouTube assiste." },
  { valor: "publica", rotulo: "Pública", dica: "Aparece no seu canal e nas buscas." },
  { valor: "privada", rotulo: "Privada", dica: "Só você e quem você autorizar no YouTube." },
] as const;

export function NovaTransmissao() {
  const [aberto, setAberto] = useState(false);
  // A key remonta o formulário a cada abertura, limpando campos e erros.
  const [rodada, setRodada] = useState(0);

  function abrir() {
    setRodada((r) => r + 1);
    setAberto(true);
  }

  return (
    <>
      <Botao onClick={abrir}>
        <Plus weight="bold" aria-hidden />
        Nova transmissão
      </Botao>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Nova transmissão">
        <FormNovaTransmissao key={rodada} aoCriar={() => setAberto(false)} />
      </Dialogo>
    </>
  );
}

function FormNovaTransmissao({ aoCriar }: { aoCriar: () => void }) {
  const [estado, acao, enviando] = useActionState<EstadoNovaTransmissao, FormData>(
    criarTransmissao,
    { tipo: "inicial" },
  );

  useEffect(() => {
    if (estado.tipo === "criada") aoCriar();
  }, [estado, aoCriar]);

  const campos = estado.tipo === "erro" ? estado.campos : undefined;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <CampoTexto
        id="titulo"
        name="titulo"
        rotulo="Título"
        required
        maxLength={100}
        autoFocus
        defaultValue={campos?.titulo}
        dica="É o título que aparece no YouTube."
      />
      <AreaTexto
        id="descricao"
        name="descricao"
        rotulo="Descrição (opcional)"
        maxLength={5000}
        defaultValue={campos?.descricao}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Privacidade no YouTube</legend>
        {OPCOES_PRIVACIDADE.map((opcao, i) => (
          <label
            key={opcao.valor}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 px-3 py-2.5 has-[:checked]:border-destaque has-[:checked]:bg-destaque/10"
          >
            <input
              type="radio"
              name="privacidade"
              value={opcao.valor}
              defaultChecked={i === 0}
              className="mt-1 accent-destaque"
            />
            <span>
              <span className="block font-medium">{opcao.rotulo}</span>
              <span className="block text-sm text-texto-suave">{opcao.dica}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Agendamento />

      <p className="rounded-md bg-white/[0.04] px-3 py-2.5 text-sm text-texto-suave">
        O canal do YouTube é escolhido depois, antes de ir ao vivo.
      </p>

      <MensagemErro>{estado.tipo === "erro" ? estado.mensagem : undefined}</MensagemErro>
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Criando…" : "Criar transmissão"}
      </Botao>
    </form>
  );
}

/** Data e hora locais (formato do input datetime-local), arredondadas para a próxima hora. */
function proximaHoraLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Agendar a live: o horário é escolhido no fuso do navegador e enviado em ISO (UTC),
 * para o servidor não precisar adivinhar o fuso de quem criou.
 */
function Agendamento() {
  const [agendar, setAgendar] = useState(false);
  const [local, setLocal] = useState("");
  const data = agendar && local ? new Date(local) : null;
  const iso = data && !Number.isNaN(data.getTime()) ? data.toISOString() : "";

  return (
    <div className="flex flex-col gap-3">
      <Interruptor
        id="agendar"
        rotulo="Agendar"
        dica="A live aparece como “Em breve” no YouTube, com lembrete para o público."
        ligado={agendar}
        aoMudar={(ligado) => {
          setAgendar(ligado);
          if (ligado && !local) setLocal(proximaHoraLocal());
        }}
      />
      {agendar && (
        <CampoTexto
          id="agendada-para"
          type="datetime-local"
          rotulo="Data e hora de início"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          required
        />
      )}
      <input type="hidden" name="agendada_para" value={iso} />
    </div>
  );
}
