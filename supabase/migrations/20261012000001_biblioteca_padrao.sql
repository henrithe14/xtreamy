-- Biblioteca padrão de música e efeitos (CC0, domínio público), visível para todo criador.
-- Os arquivos já estão no bucket "ativos", pasta sistema/ (enviados pelo script da biblioteca).
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

-- Ativos do sistema: sem dono (user_id nulo). Todos leem; ninguém altera nem apaga pelo app
-- (a política "dono gerencia ativos" só vale quando user_id = auth.uid()).
alter table public.ativos alter column user_id drop not null;

create policy "todos leem ativos do sistema" on public.ativos
  for select to authenticated using (user_id is null);

-- Rodar de novo não duplica: apaga e recria só as linhas do sistema.
delete from public.ativos where user_id is null and caminho like 'sistema/%';

insert into public.ativos (user_id, tipo, nome, caminho, mime, tamanho, metadados) values
  (null, 'musica', 'Lo-fi tranquilo', 'sistema/musica/lofi-tranquilo.mp3', 'audio/mpeg', 3069600, '{"duracao": 127.9, "autor": "omfgdude", "pagina": "https://opengameart.org/node/94031", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Lo-fi noturno', 'sistema/musica/lofi-noturno.mp3', 'audio/mpeg', 4214400, '{"duracao": 175.6, "autor": "omfgdude", "pagina": "https://opengameart.org/node/94840", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Sherwood (chill)', 'sistema/musica/sherwood.mp3', 'audio/mpeg', 3350400, '{"duracao": 139.6, "autor": "zesona (Chris Murphy)", "pagina": "https://opengameart.org/content/sherwood", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Nova ideia (corporativo leve)', 'sistema/musica/nova-ideia.mp3', 'audio/mpeg', 3192000, '{"duracao": 133.0, "autor": "hernandack", "pagina": "https://opengameart.org/content/short-loops-background-music-pack", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Só dizendo (leve)', 'sistema/musica/so-dizendo.mp3', 'audio/mpeg', 2887200, '{"duracao": 120.3, "autor": "hernandack", "pagina": "https://opengameart.org/content/short-loops-background-music-pack", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Abertura swing', 'sistema/musica/abertura-swing.mp3', 'audio/mpeg', 2990400, '{"duracao": 124.6, "autor": "hernandack", "pagina": "https://opengameart.org/content/short-loops-background-music-pack", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Poeira de inverno (eletrônico calmo)', 'sistema/musica/poeira-de-inverno.mp3', 'audio/mpeg', 2755200, '{"duracao": 114.8, "autor": "hernandack", "pagina": "https://opengameart.org/content/short-loops-background-music-pack", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Música de elevador (volto logo)', 'sistema/musica/elevador.mp3', 'audio/mpeg', 2304000, '{"duracao": 96.0, "autor": "Pro Sensory", "pagina": "https://opengameart.org/content/elevator-music", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Música de elevador 2', 'sistema/musica/elevador-2.mp3', 'audio/mpeg', 2688000, '{"duracao": 112.0, "autor": "Pro Sensory", "pagina": "https://opengameart.org/content/elevator-music-2", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Só você e eu (violão)', 'sistema/musica/violao.mp3', 'audio/mpeg', 2376000, '{"duracao": 99.0, "autor": "Pro Sensory", "pagina": "https://opengameart.org/content/just-you-and-me-guitar", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Piano calmo', 'sistema/musica/piano-calmo.mp3', 'audio/mpeg', 3960000, '{"duracao": 165.0, "autor": "cynicmusic", "pagina": "https://opengameart.org/content/calm-piano-1-vaporware", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'musica', 'Jazz de improviso', 'sistema/musica/jazz-improviso.mp3', 'audio/mpeg', 3165600, '{"duracao": 131.9, "autor": "Pro Sensory", "pagina": "https://opengameart.org/content/jazz-improvisation-looped", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Aplausos', 'sistema/efeito/aplausos.mp3', 'audio/mpeg', 355200, '{"duracao": 14.8, "autor": "Joseph Sardin", "pagina": "https://bigsoundbank.com/applause-from-40-people-6-s3522.html", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Risada da plateia', 'sistema/efeito/risada-plateia.mp3', 'audio/mpeg', 76800, '{"duracao": 3.2, "autor": "Nox_Sound", "pagina": "https://freesound.org/people/Nox_Sound/sounds/752711/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Risada', 'sistema/efeito/risada.mp3', 'audio/mpeg', 67200, '{"duracao": 2.8, "autor": "jayfrosting", "pagina": "https://freesound.org/people/jayfrosting/sounds/333403/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Fanfarra de sucesso', 'sistema/efeito/fanfarra.mp3', 'audio/mpeg', 105600, '{"duracao": 4.4, "autor": "FunWithSound", "pagina": "https://freesound.org/people/FunWithSound/sounds/456966/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Missão cumprida', 'sistema/efeito/missao-cumprida.mp3', 'audio/mpeg', 237600, '{"duracao": 9.9, "autor": "qubodup", "pagina": "https://freesound.org/people/qubodup/sounds/166540/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Resposta errada', 'sistema/efeito/resposta-errada.mp3', 'audio/mpeg', 67200, '{"duracao": 2.8, "autor": "Breviceps", "pagina": "https://freesound.org/people/Breviceps/sounds/493163/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Buzzer curto', 'sistema/efeito/buzzer.mp3', 'audio/mpeg', 7200, '{"duracao": 0.3, "autor": "-Andreas", "pagina": "https://freesound.org/people/-Andreas/sounds/650842/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Rufar de tambor', 'sistema/efeito/rufar.mp3', 'audio/mpeg', 206400, '{"duracao": 8.6, "autor": "HoBoTrails", "pagina": "https://freesound.org/people/HoBoTrails/sounds/424927/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Ba-dum-tss', 'sistema/efeito/ba-dum-tss.mp3', 'audio/mpeg', 91200, '{"duracao": 3.8, "autor": "jmayoff", "pagina": "https://freesound.org/people/jmayoff/sounds/256959/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Whoosh (transição)', 'sistema/efeito/whoosh.mp3', 'audio/mpeg', 50400, '{"duracao": 2.1, "autor": "BennettFilmTeacher", "pagina": "https://freesound.org/people/BennettFilmTeacher/sounds/486234/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Suspense', 'sistema/efeito/suspense.mp3', 'audio/mpeg', 360000, '{"duracao": 15.0, "autor": "AbrahamMast", "pagina": "https://freesound.org/people/AbrahamMast/sounds/514631/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Grilos (silêncio constrangedor)', 'sistema/efeito/grilos.mp3', 'audio/mpeg', 276000, '{"duracao": 11.5, "autor": "Wolfgang_", "pagina": "https://opengameart.org/content/crickets-ambient-noise-loopable", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Caixa registradora', 'sistema/efeito/caixa-registradora.mp3', 'audio/mpeg', 96000, '{"duracao": 4.0, "autor": "videofueralle", "pagina": "https://freesound.org/people/videofueralle/sounds/455397/", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Campainha', 'sistema/efeito/campainha.mp3', 'audio/mpeg', 120000, '{"duracao": 5.0, "autor": "Joseph Sardin", "pagina": "https://bigsoundbank.com/doorbell-1-s0088.html", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Buzina', 'sistema/efeito/buzina.mp3', 'audio/mpeg', 9600, '{"duracao": 0.4, "autor": "Joseph Sardin", "pagina": "https://bigsoundbank.com/pneumatic-horn-simple-1-s1827.html", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Bipes de contagem', 'sistema/efeito/contagem.mp3', 'audio/mpeg', 96000, '{"duracao": 4.0, "autor": "Joseph Sardin", "pagina": "https://bigsoundbank.com/hourly-bips-3-s1629.html", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Bipe de censura', 'sistema/efeito/censura.mp3', 'audio/mpeg', 28800, '{"duracao": 1.2, "autor": "Joseph Sardin", "pagina": "https://bigsoundbank.com/censorship-2-s1311.html", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Notificação', 'sistema/efeito/notificacao.mp3', 'audio/mpeg', 2400, '{"duracao": 0.1, "autor": "Kenney", "pagina": "https://opengameart.org/content/interface-sounds", "licenca": "CC0 1.0 (domínio público)"}'::jsonb),
  (null, 'efeito', 'Confirmação', 'sistema/efeito/confirmacao.mp3', 'audio/mpeg', 7200, '{"duracao": 0.3, "autor": "Kenney", "pagina": "https://opengameart.org/content/interface-sounds", "licenca": "CC0 1.0 (domínio público)"}'::jsonb);
