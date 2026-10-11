-- Etapa 9: banners e estilos salvos para reusar em qualquer transmissão.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 200),
  estilo text not null default 'faixa' check (estilo in ('faixa', 'letreiro')),
  criado_em timestamptz not null default now()
);

create table public.estilos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  -- { estilo: { tema, fonte, camera }, cores: { primaria, secundaria } }, validado no servidor.
  definicao jsonb not null,
  criado_em timestamptz not null default now()
);

alter table public.banners enable row level security;
alter table public.estilos enable row level security;

create policy "dono gerencia banners" on public.banners
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono gerencia estilos" on public.estilos
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.banners, public.estilos from anon;
grant select, insert, update, delete on public.banners, public.estilos to authenticated;
