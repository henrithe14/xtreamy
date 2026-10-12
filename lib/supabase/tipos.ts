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
  youtube_stream_id: string | null;
  categoria_id: string | null;
  tags: string[];
  idioma: string;
  live_chat_id: string | null;
  egress_id: string | null;
  /** ISO; nulo = sem agendamento. */
  agendada_para: string | null;
  criado_em: string;
};

/** Colunas que o usuário logado pode ler (o refresh token só o servidor lê). */
export type LinhaDestino = {
  id: string;
  user_id: string;
  tipo: "youtube";
  channel_id: string;
  nome_canal: string;
  avatar_url: string | null;
  criado_em: string;
};

type LinhaDestinoCompleta = LinhaDestino & { refresh_token_cifrado: string };

export type LinhaBanner = { id: string; user_id: string; texto: string; estilo: "faixa" | "letreiro"; criado_em: string };
export type LinhaCenaSalva = { user_id: string; definicao: unknown; atualizado_em: string };
export type LinhaRoteiro = { id: string; user_id: string; titulo: string; texto: string; criado_em: string };
export type LinhaEstilo = { id: string; user_id: string; nome: string; definicao: unknown; criado_em: string };

export type LinhaAtivo = {
  id: string;
  /** null = ativo do sistema (biblioteca padrão), visível para todos. */
  user_id: string | null;
  tipo: "logo" | "overlay" | "fundo" | "midia" | "vinheta" | "musica" | "efeito";
  nome: string;
  caminho: string;
  mime: string;
  tamanho: number;
  metadados: unknown;
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
      banners: {
        Row: LinhaBanner;
        Insert: Pick<LinhaBanner, "texto"> & Partial<Pick<LinhaBanner, "estilo" | "user_id">>;
        Update: Partial<LinhaBanner>;
        Relationships: [];
      };
      estilos: {
        Row: LinhaEstilo;
        Insert: Pick<LinhaEstilo, "nome" | "definicao"> & Partial<Pick<LinhaEstilo, "user_id">>;
        Update: Partial<LinhaEstilo>;
        Relationships: [];
      };
      cena_salva: {
        Row: LinhaCenaSalva;
        Insert: Pick<LinhaCenaSalva, "user_id" | "definicao"> & Partial<Pick<LinhaCenaSalva, "atualizado_em">>;
        Update: Partial<LinhaCenaSalva>;
        Relationships: [];
      };
      roteiros: {
        Row: LinhaRoteiro;
        Insert: Pick<LinhaRoteiro, "titulo" | "texto"> & Partial<Pick<LinhaRoteiro, "user_id">>;
        Update: Partial<LinhaRoteiro>;
        Relationships: [];
      };
      ativos: {
        Row: LinhaAtivo;
        Insert: Pick<LinhaAtivo, "tipo" | "nome" | "caminho" | "mime" | "tamanho"> & Partial<Pick<LinhaAtivo, "metadados" | "user_id">>;
        Update: Partial<LinhaAtivo>;
        Relationships: [];
      };
      destinos: {
        Row: LinhaDestinoCompleta;
        Insert: Pick<LinhaDestinoCompleta, "user_id" | "channel_id" | "nome_canal" | "refresh_token_cifrado"> &
          Partial<Pick<LinhaDestinoCompleta, "avatar_url" | "tipo">>;
        Update: Partial<LinhaDestinoCompleta>;
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
