import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Xtreamy",
  description: "Estúdio de transmissões ao vivo no navegador, com saída para o YouTube.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: extensões do navegador (corretores, conta-gotas) injetam
    // atributos em <html>/<body> antes do React; só esses dois elementos são afetados.
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
