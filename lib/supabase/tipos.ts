// Tipos do banco (espelham supabase/migrations). Manter em sincronia ao mudar o schema.
import type { StatusTransmissao } from "@/lib/transmissao";

export type Privacidade = "publica" | "nao_listada" | "privada";

type LinhaTransmissao = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string;
  privacidade: Privacidade;
  destino_id: string | null;
  status: StatusTransmissao;
  codigo_convite: string;
  youtube_broadcast_id: string | null;
  live_chat_id: string | null;
  egress_id: string | null;
  /** ISO; nulo = sem agendamento. */
  agendada_para: string | null;
  criado_em: string;
};

export type Database = {
  public: {
    Tables: {
      transmissoes: {
        Row: LinhaTransmissao;
        Insert: Pick<LinhaTransmissao, "titulo" | "codigo_convite"> &
          Partial<Omit<LinhaTransmissao, "titulo" | "codigo_convite">>;
        Update: Partial<LinhaTransmissao>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      dados_convite: {
        Args: { p_transmissao: string; p_codigo: string };
        Returns: { titulo: string }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
