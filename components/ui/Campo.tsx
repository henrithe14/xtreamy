import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const ESTILO_CONTROLE =
  "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-texto placeholder:text-texto-suave/70 focus:border-destaque focus:outline-none";

type Rotulado = { rotulo: string; dica?: ReactNode };

export function CampoTexto({ rotulo, dica, id, className = "", ...props }: Rotulado & InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input id={id} className={`${ESTILO_CONTROLE} min-h-11 ${className}`} {...props} />
      {dica && <p className="text-xs text-texto-suave">{dica}</p>}
    </div>
  );
}

export function AreaTexto({ rotulo, dica, id, className = "", ...props }: Rotulado & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <textarea id={id} className={`${ESTILO_CONTROLE} min-h-24 resize-y ${className}`} {...props} />
      {dica && <p className="text-xs text-texto-suave">{dica}</p>}
    </div>
  );
}

export function MensagemErro({ children }: { children?: ReactNode }) {
  return (
    <p role="alert" aria-live="polite" className="min-h-5 text-sm text-no-ar">
      {children}
    </p>
  );
}
