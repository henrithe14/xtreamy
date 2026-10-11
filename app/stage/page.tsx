import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaStage } from "@/components/stage/PaginaStage";

export const metadata: Metadata = { title: "Saída da live · Xtreamy", robots: { index: false } };

/**
 * Saída da live (1920×1080). Duas formas de abrir:
 * - Egress do LiveKit: ?url=…&token=… (token do próprio Egress, Etapa 6);
 * - Diretor conferindo numa aba: ?t=<transmissão> (token oculto pedido ao servidor).
 */
export default function Stage() {
  return (
    <Suspense>
      <PaginaStage />
    </Suspense>
  );
}
