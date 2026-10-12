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
    <div
      className={`flex items-center justify-center [container-type:size] ${className}`}
      style={{ background: "radial-gradient(70% 90% at 50% 40%, #1c2a45 0%, #111a2c 60%, #0c1322 100%)" }}
    >
      <span
        className={`relative flex aspect-square w-[34cqmin] items-center justify-center rounded-full text-[12cqmin] font-semibold tracking-tight text-texto ring-[0.6cqmin] transition-[box-shadow,--tw-ring-color] duration-200 ${
          falando
            ? "ring-pronto shadow-[0_0_0_2.5cqmin_rgb(16_185_129/0.18),0_0_8cqmin_rgb(16_185_129/0.35)]"
            : "ring-white/15 shadow-none"
        }`}
        style={{ background: "linear-gradient(150deg, rgb(59 130 246 / 0.45), rgb(59 130 246 / 0.12) 70%)" }}
      >
        {nome.trim() ? iniciais(nome) : <User weight="bold" className="size-[45%] text-texto-suave" aria-hidden />}
      </span>
    </div>
  );
}
