-- Agendamento: horário previsto de início da live (vira o scheduledStartTime no YouTube, Etapa 5).
-- Rode no Supabase: SQL Editor → New query → cole → Run.

alter table public.transmissoes
  add column agendada_para timestamptz;

comment on column public.transmissoes.agendada_para is
  'Início previsto da live (nulo = sem agendamento). Usado como scheduledStartTime no YouTube.';
