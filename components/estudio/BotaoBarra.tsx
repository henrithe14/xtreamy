import type { ReactNode } from "react";

type Props = {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
  /** Para botões de liga/desliga (câmera, microfone): informa o estado. */
  ligado?: boolean;
  perigo?: boolean;
  desativado?: boolean;
};

/** Botão da barra inferior: ícone grande com rótulo curto embaixo (bom no celular). */
export function BotaoBarra({ rotulo, onClick, children, ligado, perigo = false, desativado }: Props) {
  const cor = perigo
    ? "bg-no-ar text-white hover:brightness-110"
    : ligado === false
      ? "bg-no-ar/15 text-no-ar hover:bg-no-ar/25"
      : "bg-white/[0.06] text-texto ring-1 ring-white/10 ring-inset hover:bg-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativado}
      aria-pressed={ligado}
      className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 [&_svg]:size-6 ${cor}`}
    >
      {children}
      {rotulo}
    </button>
  );
}
