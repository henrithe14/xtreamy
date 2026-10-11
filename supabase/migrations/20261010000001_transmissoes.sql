-- Etapa 1: transmissões e validação de convite.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table public.transmissoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 100),
  descricao text not null default '' check (char_length(descricao) <= 5000),
  privacidade text not null default 'nao_listada'
    check (privacidade in ('publica', 'nao_listada', 'privada')),
  destino_id uuid, -- a referência para `destinos` entra na Etapa 5
  status text not null default 'rascunho'
    check (status in ('rascunho', 'ensaio', 'ao_vivo', 'intervalo', 'encerrada')),
  codigo_convite text not null check (char_length(codigo_convite) >= 20),
  youtube_broadcast_id text,
  live_chat_id text,
  egress_id text,
  criado_em timestamptz not null default now()
);

create index transmissoes_user_criado_idx on public.transmissoes (user_id, criado_em desc);

-- RLS: cada usuário só enxerga e altera as próprias transmissões.
alter table public.transmissoes enable row level security;

create policy "dono lê" on public.transmissoes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono cria" on public.transmissoes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono altera" on public.transmissoes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono exclui" on public.transmissoes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Visitantes (convidados sem conta) não acessam a tabela diretamente.
revoke all on public.transmissoes from anon;
grant select, insert, update, delete on public.transmissoes to authenticated;

-- Convidado: valida id + código do convite e devolve só o título.
-- security definer = roda com permissão do dono da função, ignorando o RLS,
-- mas expõe apenas o título e somente para quem tem o código certo.
create function public.dados_convite(p_transmissao uuid, p_codigo text)
returns table (titulo text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.titulo
  from public.transmissoes t
  where t.id = p_transmissao
    and t.codigo_convite = p_codigo
    and t.status <> 'encerrada';
$$;

revoke all on function public.dados_convite(uuid, text) from public;
grant execute on function public.dados_convite(uuid, text) to anon, authenticated;
