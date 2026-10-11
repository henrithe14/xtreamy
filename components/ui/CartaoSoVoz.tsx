import { User } from "@phosphor-icons/react/ssr";

/** Iniciais para o avatar: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

type Props = { nome: string; falando: boolean; className?: string };

/**
 * Participante sem câmera: avatar com iniciais e um anel que acende quando a
 * pessoa fala (CLAUDE.md, "Só voz"). Usado na pré-entrada e, depois, no palco.
 */
export function CartaoSoVoz({ nome, falando, className = "" }: Props) {
  return (
    // Tamanhos em cqmin: o avatar acompanha o quadro, do miniatura ao tela cheia.
    <div className={`flex items-center justify-center bg-superficie-2 [container-type:size] ${className}`}>
      <span
        className={`flex aspect-square w-[38cqmin] items-center justify-center rounded-full bg-destaque text-[14cqmin] font-bold text-destaque-texto outline-offset-[2.5cqmin] transition-[outline-color] duration-150 ${
          falando ? "outline-[2cqmin] outline-pronto" : "outline-[2cqmin] outline-transparent"
        }`}
      >
        {nome.trim() ? iniciais(nome) : <User weight="fill" className="size-1/2" aria-hidden />}
      </span>
    </div>
  );
}
