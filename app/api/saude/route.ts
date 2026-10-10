import { connection } from "next/server";
import { verificarSupabase } from "@/lib/saude";

/** Verificação simples: o app está no ar e o Supabase responde. */
export async function GET() {
  await connection();
  const supabase = await verificarSupabase();
  return Response.json({ app: "ok", supabase }, { status: supabase === "erro" ? 503 : 200 });
}
