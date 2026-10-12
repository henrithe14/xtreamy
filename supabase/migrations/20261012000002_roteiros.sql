-- Etapa 13: roteiros do teleprompter (salvos pelo criador, reusáveis em qualquer transmissão).
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table public.roteiros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 80),
  texto text not null check (char_length(texto) between 1 and 20000),
  criado_em timestamptz not null default now()
);

create index roteiros_user_idx on public.roteiros (user_id, criado_em desc);

alter table public.roteiros enable row level security;
create policy "dono gerencia roteiros" on public.roteiros
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.roteiros from anon;
grant select, insert, update, delete on public.roteiros to authenticated;
