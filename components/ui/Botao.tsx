import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "no-ar";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-destaque text-destaque-texto hover:bg-destaque-forte",
  secundario: "bg-superficie-2 text-texto hover:bg-borda",
  fantasma: "text-texto-suave hover:bg-superficie-2 hover:text-texto",
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
