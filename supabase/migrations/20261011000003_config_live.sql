-- Configurações da live no YouTube (categoria, tags, idioma). A capa vai direto para o YouTube.
-- Rode no Supabase: SQL Editor → New query → cole → Run.

alter table public.transmissoes
  add column categoria_id text,
  add column tags text[] not null default '{}',
  add column idioma text not null default 'pt-BR';
