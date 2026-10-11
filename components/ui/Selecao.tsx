import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  rotulo: string;
  icone?: ReactNode;
};

export function Selecao({ id, rotulo, icone, className = "", children, ...props }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium [&_svg]:size-4 [&_svg]:text-texto-suave">
        {icone}
        {rotulo}
      </label>
      <select
        id={id}
        className={`min-h-11 w-full min-w-0 truncate rounded-md border border-borda bg-fundo px-3 text-texto focus:border-destaque focus:outline-none disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

type PropsInterruptor = {
  id: string;
  rotulo: string;
  dica?: string;
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
};

/** Liga/desliga acessível (checkbox com aparência de chave). */
export function Interruptor({ id, rotulo, dica, ligado, aoMudar }: PropsInterruptor) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{rotulo}</span>
        {dica && <span className="block text-xs text-texto-suave">{dica}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={ligado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-borda transition-colors peer-checked:bg-destaque peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-destaque after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
