import { SignOut } from "@phosphor-icons/react/ssr";
import { exigirUsuario } from "@/lib/auth";
import { sair } from "@/lib/acoes/auth";
import { Botao } from "@/components/ui/Botao";

export async function MenuUsuario() {
  const usuario = await exigirUsuario();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-texto-suave sm:inline">{usuario.email}</span>
      <form action={sair}>
        <Botao type="submit" variante="fantasma">
          <SignOut weight="bold" aria-hidden />
          Sair
        </Botao>
      </form>
    </div>
  );
}
