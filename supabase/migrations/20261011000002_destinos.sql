-- Etapa 5: destinos (canais do YouTube conectados) e vínculo com a live criada no YouTube.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table public.destinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null default 'youtube' check (tipo = 'youtube'),
  channel_id text not null,
  nome_canal text not null,
  avatar_url text,
  -- Refresh token do Google, criptografado no servidor (AES-256-GCM). Nunca vai ao navegador.
  refresh_token_cifrado text not null,
  criado_em timestamptz not null default now(),
  unique (user_id, channel_id)
);

alter table public.destinos enable row level security;

-- O dono vê e remove os próprios destinos. Criar/atualizar só pelo servidor (chave de serviço).
create policy "dono lê destinos" on public.destinos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono remove destinos" on public.destinos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Permissão por coluna: o usuário logado NÃO consegue ler refresh_token_cifrado.
revoke all on public.destinos from anon, authenticated;
grant select (id, user_id, tipo, channel_id, nome_canal, avatar_url, criado_em) on public.destinos to authenticated;
grant delete on public.destinos to authenticated;

-- Transmissão ↔ destino e ↔ stream do YouTube (a chave RTMP não é guardada: é buscada ao iniciar).
alter table public.transmissoes add column youtube_stream_id text;
alter table public.transmissoes
  add constraint transmissoes_destino_fk foreign key (destino_id) references public.destinos (id) on delete set null;
