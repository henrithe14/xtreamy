-- Último visual usado pelo criador (layout, tamanho do Solo, cores, tema, logo, overlay e
-- fundo): uma linha por criador. Toda transmissão nova (ou sala que esvaziou) começa assim.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table public.cena_salva (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  definicao jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.cena_salva enable row level security;
create policy "dono gerencia a cena salva" on public.cena_salva
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.cena_salva from anon;
grant select, insert, update, delete on public.cena_salva to authenticated;
