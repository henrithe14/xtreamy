-- Etapa 10: ativos de mídia (logo, overlay, fundo, mídias, vinhetas; música e efeitos na Etapa 11).
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

-- Bucket único e público: a live (Egress) carrega os arquivos sem login.
-- Caminho: {user_id}/{tipo}/{aleatório}.{ext} — só o dono envia ou apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ativos', 'ativos', true, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
on conflict (id) do nothing;

create policy "dono envia ativos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ativos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "dono apaga ativos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ativos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.ativos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('logo', 'overlay', 'fundo', 'midia', 'vinheta', 'musica', 'efeito')),
  nome text not null check (char_length(nome) between 1 and 120),
  caminho text not null,
  mime text not null,
  tamanho bigint not null,
  -- { categoria?: 'iniciar' | 'volto-logo' | 'finalizar' | 'outras', duracao?: segundos }
  metadados jsonb not null default '{}',
  criado_em timestamptz not null default now()
);

create index ativos_user_tipo_idx on public.ativos (user_id, tipo, criado_em desc);

alter table public.ativos enable row level security;
create policy "dono gerencia ativos" on public.ativos
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.ativos from anon;
grant select, insert, update, delete on public.ativos to authenticated;
