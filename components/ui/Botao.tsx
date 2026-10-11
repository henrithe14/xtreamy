import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "no-ar";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-destaque text-destaque-texto shadow-[0_8px_24px_-12px_rgb(59_130_246/0.8)] hover:bg-destaque-forte",
  secundario: "bg-white/[0.06] text-texto ring-1 ring-white/10 ring-inset hover:bg-white/10",
  fantasma: "text-texto-suave hover:bg-white/[0.06] hover:text-texto",
  "no-ar": "bg-no-ar text-white hover:brightness-110",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante };

export function Botao({ variante = "primario", className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}
