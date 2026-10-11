import { LinkBreak } from "@phosphor-icons/react/ssr";

export function ConviteInvalido() {
  return (
    <section className="flex max-w-md flex-col items-start gap-3">
      <LinkBreak weight="fill" className="size-10 text-no-ar" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">Convite inválido</h1>
      <p className="text-texto-suave">
        Este link não funciona mais ou está incompleto. Peça um novo convite a quem organizou a
        transmissão.
      </p>
    </section>
  );
}
