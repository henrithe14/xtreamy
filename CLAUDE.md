# Xtreamy — plataforma própria de transmissão ao vivo

> Este arquivo é a fonte da verdade do projeto. Leia inteiro antes de qualquer tarefa. O produto se chama **Xtreamy**; "estúdio" é o nome da sala ("Entrar no estúdio").

## 1. Visão

Um estúdio de lives no navegador, no estilo dos estúdios de transmissão conhecidos (StreamYard e similares), integrado ao YouTube:

- Até **10 participantes** entram por **link**, no desktop ou no celular, sem instalar nada. Convidados não precisam de conta; quem cria transmissões faz **login**.
- Um **diretor (host)** controla quem aparece, os layouts, as artes, as mídias, o áudio, os widgets e a transmissão.
- O resultado é composto num canvas **1920×1080** e enviado via **RTMP para o YouTube Live** (o "Destino").
- Diferenciais que motivaram o projeto: estabilidade sob nosso controle, **layouts editáveis**, **só voz com avatar**, **mutar só para os ouvintes** (a equipe ouve, a live não), **ponto**, **teleprompter**, música de fundo e efeitos, widgets e **corte ao vivo**.

## 2. Regras de trabalho (para o Claude Code)

1. **Uma etapa por vez.** Implemente só a etapa pedida (seção 12). Ao terminar, liste o que testar manualmente e pare.
2. **TypeScript estrito**, sem `any` sem justificativa. Componentes pequenos, lógica de mídia em hooks (`/hooks`) e serviços (`/lib`), nada de lógica pesada dentro do JSX.
3. **Segredos só em `.env.local`** e nas variáveis da Vercel. Nunca no código, em logs ou em commits. Tokens do LiveKit e tokens do Google são tratados **apenas no servidor**.
4. **Interface toda em português do Brasil.**
5. **Não copiar a marca de ninguém.** A referência são os *padrões funcionais* de estúdios de live, nunca o logo, o nome, os textos, as ilustrações ou as cores exatas do StreamYard ou de outros produtos. Identidade visual própria e neutra (seção 9).
6. Antes de mudar a arquitetura, adicionar dependência pesada ou serviço pago, **pergunte**.
7. Prefira os componentes e hooks oficiais do LiveKit (`@livekit/components-react`) a reimplementar WebRTC.
8. Ao final de cada etapa, sugira a mensagem de commit.

## 3. Stack

| Camada | Escolha |
|---|---|
| App (front + back) | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS + componentes próprios; ícones flat `@phosphor-icons/react` (peso `fill`) |
| Login, banco e arquivos | **Supabase** (Auth, Postgres e Storage), um serviço só, com plano gratuito |
| Vídeo/áudio em tempo real | LiveKit Cloud + `livekit-client` + `@livekit/components-react` |
| Servidor (tokens, egress) | `livekit-server-sdk` em Route Handlers do Next |
| Transmissão | LiveKit Egress (*room composite* com template próprio) → RTMP YouTube |
| Template de composição | Rota `/stage` + `@livekit/egress-sdk` |
| Destino YouTube | YouTube Data API v3 (OAuth do dono do canal, separado do login) |
| Corte ao vivo | Só **marcação de tempo** no banco (sem gravar nem exportar vídeo, seção 10.4) |
| Hospedagem | Vercel + domínio próprio |

## 4. Variáveis de ambiente (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVEKIT_URL=wss://SEU-PROJETO.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=wss://SEU-PROJETO.livekit.cloud
APP_BASE_URL=http://localhost:3000          # em produção: https://seu-dominio
GOOGLE_CLIENT_ID=                            # OAuth do YouTube (Destino)
GOOGLE_CLIENT_SECRET=
TOKEN_ENCRYPTION_KEY=                        # para criptografar refresh tokens do Google no banco
```

Crie também um `.env.example` com as mesmas chaves vazias e mantenha `.env.local` no `.gitignore`.

## 5. Estrutura de pastas

```
/app
  /page.tsx                         → Home (logado): Nova Transmissão, Destinos, lista de transmissões
  /login/page.tsx
  /destinos/page.tsx                → conectar/gerenciar canais do YouTube
  /t/[id]/entrar/page.tsx           → tela "Entrar no Estúdio" (pré-entrada)
  /t/[id]/estudio/page.tsx          → estúdio (host e convidados; controles conforme o papel)
  /stage/page.tsx                   → template de composição (Egress e prévia)
  /api/token/route.ts               → token LiveKit (host | convidado | stage)
  /api/live/[acao]/route.ts         → iniciar | intervalo | retomar | encerrar
  /api/youtube/...                  → OAuth, criar broadcast, chat
  /api/corte/route.ts               → registrar marcação de corte (últimos X minutos)
/components
  /home  /entrar  /estudio  /stage  /layout-editor  /ui
/lib
  cena.ts  layouts.ts  livekit.ts  youtube.ts  transmissao.ts  env.ts
  /supabase  navegador.ts (Client Components)  servidor.ts (servidor, com cookies)
/hooks
  useCena.ts  usePonto.ts  useAudioPrivado.ts  useTeleprompter.ts
```

## 6. Banco de dados (Supabase)

Tabelas iniciais (com RLS: cada usuário só vê o que é seu):

- `destinos`: id, user_id, tipo ('youtube'), nome do canal, channel_id, refresh_token **criptografado**.
- `transmissoes`: id, user_id, titulo, descricao, privacidade ('publica' | 'nao_listada' | 'privada'), destino_id, status ('rascunho' | 'ensaio' | 'ao_vivo' | 'intervalo' | 'encerrada'), codigo_convite, youtube_broadcast_id, live_chat_id, egress_id, criado_em. Convidados (sem conta) não leem a tabela: o convite é validado pela função `dados_convite(id, codigo)` (security definer), que devolve só o título.
- `layouts`: id, user_id (null = padrão do sistema), nome, definicao (JSON, seção 8.3).
- `estilos`: id, user_id, nome, definicao (JSON: tema, cores, fontes, câmera).
- `ativos`: id, user_id, tipo ('logo' | 'overlay' | 'vinheta' | 'midia' | 'fundo' | 'musica' | 'efeito'), nome, url (Storage), metadados (duração, categoria: 'iniciar' | 'volto-logo' | 'finalizar'…).
- `cortes`: id, transmissao_id, inicio_seg, fim_seg (segundos desde o início da live no YouTube), nome, nota, criado_por, criado_em.
- `banners`, `enquetes`, `roteiros` (teleprompter): criados nas etapas correspondentes.

Arquivos ficam no **Supabase Storage**, num bucket por tipo de ativo.

Migrações SQL ficam em `supabase/migrations/` e são aplicadas no SQL Editor do Supabase. Os tipos do banco ficam em `lib/supabase/tipos.ts` (manter em sincronia). A tabela `destinos` e a referência `transmissoes.destino_id → destinos` entram na Etapa 5.

**Contas:** não há cadastro público. O criador é criado no painel do Supabase (Authentication → Users → Add user) e o cadastro aberto fica desligado.

## 7. Conceitos centrais

### Papéis
- **host (diretor):** controla tudo. É o dono da transmissão (logado).
- **convidado:** entra pelo link de convite, sem conta. Tem câmera, microfone, apresentar e chat interno.
- **stage:** participante oculto usado pelo Egress e pela prévia. Só assina faixas e **nunca publica**.

A permissão vem do **token** gerado no servidor, nunca de parâmetro de URL confiado no cliente.

Implementação (Etapa 3): `lib/acesso.ts → resolverAcesso(id, codigo)` decide o papel (dono logado = host; código válido = convidado) e é usado pelas páginas e por `POST /api/token`. Sala do LiveKit = `t-{transmissaoId}`. Identity: `host-{userId}` ou `conv-{aleatório}` guardado em cookie httpOnly por transmissão (recarregar volta como a mesma pessoa). Papel e etiqueta vão no metadata do token (`lib/participante.ts`), que o participante não pode alterar.

### Acesso: login só para o criador
- **Login (Supabase Auth) é exigido apenas para o criador da live**: Home, Destinos, Nova Transmissão e entrar no estúdio como host.
- **Convidados nunca fazem login nem criam conta.** Entram só pelo **link do estúdio**, passam pela tela "Entrar no Estúdio" (nome obrigatório, etiqueta opcional) e recebem papel de convidado.
- O link de convite carrega um **código secreto aleatório** (ex.: `/t/[id]/entrar?c=XXXX`), validado no servidor antes de gerar o token LiveKit. Sem código válido, não há entrada.
- **O link de convite é sempre de convidado**: com `?c=` o papel é convidado mesmo que o dono esteja logado (assim ele pode testar como convidado sem derrubar a própria sessão).
- O host pode **gerar um novo link** (invalida o anterior) e **remover** convidados da sala.
- O próprio host, quando logado e dono da transmissão, entra com papel de host pelo "Entrar no estúdio" da Home (sem código).

### Modo diretor
Na pré-entrada o host escolhe "Diretor e apresentador" ou "Só diretor" (`preferencias.modoHost`, vai no metadata como `soDiretor`). A troca durante a live (menu de cima) entra na Etapa 7. O host pode alternar entre:
- **Modo apresentador:** está na sala com câmera/mic e pode ir ao palco.
- **Modo diretor:** só controla. Não publica câmera, não aparece e não é ouvido na live, mas ouve tudo e fala com a equipe/ponto. Interface com os controles em destaque.

### Estado da cena (fonte única da verdade)
Fica nos **metadata da sala** do LiveKit (atualizados pelo servidor a pedido do host) e é lido por todos, inclusive pelo `/stage`.

```ts
type Cena = {
  layoutId: string;                 // referência a um layout (padrão ou do usuário)
  noPalco: string[];                // identities, em ordem de slot
  destaqueId?: string;
  apresentacaoId?: string;          // quem está apresentando (tela)
  estiloId: string;                 // tema, cores, fontes, câmera
  fundo?: string;                   // imagem/vídeo de fundo
  logo?: { url: string; posicao: 'se' | 'sd' | 'ie' | 'id' };
  overlay?: string;
  etiquetas: Record<string, { visivel: boolean }>;   // usa nome + etiqueta do participante
  banner?: { id: string; estilo: 'faixa' | 'letreiro' };
  comentarioDestacado?: { autor: string; avatar?: string; texto: string; origem: 'youtube' | 'interno' };
  midia?: { ativoId: string; tocando: boolean; telaCheia: boolean };
  vinheta?: { ativoId: string; tocando: boolean };
  musica?: { ativoId: string; tocando: boolean; volume: number };   // 0–1
  widgets: {
    enquete?: { id: string; visivel: boolean };
    qrcode?: { url: string; legenda?: string; posicao: string; visivel: boolean };
    manchete?: { texto: string; visivel: boolean };
  };
  status: 'ensaio' | 'ao_vivo' | 'intervalo' | 'encerrada';
};
```

Efeitos sonoros **não** ficam na cena (são disparos pontuais): o host envia um evento por *data message* para o `/stage`, que toca o som uma vez.

### Palco × bastidor
- **No palco:** aparece no vídeo e o áudio vai para a live.
- **No bastidor:** está na sala, vê e ouve tudo, conversa com a equipe, mas **não aparece e não é ouvido na live**.
- O `/stage` só renderiza e **só toca o áudio** de quem está em `noPalco`. Essa regra é a garantia do bastidor.

### Mutar só para os ouvintes
- Botão em cada participante (host) e na barra do próprio participante: marca `audioPrivado: true` nos metadata do participante. O `/stage` ignora o áudio dele enquanto a marca estiver ativa; o vídeo continua.
- A equipe continua ouvindo normalmente. Indicador visível: "🔇 mudo para a live".

### Ponto (diretor → um participante)
- O host publica uma faixa de áudio separada chamada `ponto`.
- `setTrackSubscriptionPermissions` garante que **só o participante alvo** possa assinar. O `/stage` nunca a assina.
- Na tela do alvo: indicador "Diretor falando com você".

### Teleprompter
- O host cria roteiros (texto) e envia para um ou mais participantes.
- Aparece **só na tela do participante**, numa faixa sobreposta perto da câmera (para manter o olhar), com rolagem automática. Velocidade, tamanho da fonte, pausar e voltar ficam com o host e com o próprio participante.
- Sincronizado por *data message*; **nunca** aparece no `/stage`.

### Só voz
- Participante sem câmera aparece como **cartão com avatar/iniciais, nome, etiqueta e anel animado** quando fala.

## 8. Transmissão

### 8.1 Destino e Nova Transmissão
- **Destinos:** o usuário conecta um canal do YouTube via OAuth (escopo de gerenciar o YouTube). O refresh token fica criptografado em `destinos`.
- **Nova Transmissão:** título, descrição, destino e privacidade (pública, não listada, privada). O servidor cria automaticamente no YouTube o `liveBroadcast` e o `liveStream` e os vincula, obtendo a URL RTMP, a chave e o `liveChatId` **sem o usuário copiar chave nenhuma**.
- Gera o link de convite da transmissão.

### 8.2 Iniciar / Intervalo / Encerrar
- **Iniciar:** inicia um **RoomCompositeEgress** com `customBaseUrl = APP_BASE_URL + '/stage'`, saída RTMP (1080p, 30fps). Depois faz a transição do broadcast para "live" quando o YouTube indicar que o sinal chegou.
- **Intervalo ("pausar"):** o YouTube não tem pausa de verdade. O intervalo **mantém o egress rodando**, troca a cena para a mídia "volto logo", tira todos do áudio da live e, opcionalmente, toca a música de fundo. "Retomar" restaura a cena anterior.
- **Encerrar:** pode tocar a vinheta/mídia "finalizar", depois para o egress e finaliza o broadcast no YouTube. Pedir confirmação antes.
- O `/stage` usa o `EgressHelper` do `@livekit/egress-sdk` e chama `startRecording()` só quando a cena estiver carregada.
- Durante o desenvolvimento, testar sempre com transmissões **não listadas**.

### 8.3 Layouts ("Disposições")
Um layout é um JSON com **slots em porcentagem** do canvas, o que facilita criar e editar:

```ts
type Layout = {
  id: string; nome: string;
  slots: { x: number; y: number; w: number; h: number; z?: number; tipo?: 'pessoa' | 'apresentacao' | 'midia' }[];
  maxPessoas: number;
};
```

- **Padrões do sistema:** solo, grade (2–10, automática), lado a lado, destaque + miniaturas, apresentação + câmeras, mídia em tela cheia.
- **Editar / Novo:** editor visual com o canvas 16:9, arrastar e redimensionar slots, grade magnética, duplicar um padrão como ponto de partida e salvar em `layouts`.
- Pessoas preenchem os slots `pessoa` na ordem de `noPalco`; o slot `apresentacao` recebe a tela compartilhada.

### 8.4 Camadas do `/stage` (de baixo para cima)
fundo → vídeos/cartões nos slots → etiquetas (nome + etiqueta) → comentário destacado → banner/manchete → widgets (enquete, QR) → logo → overlay → mídia em tela cheia → vinheta.
Transições suaves (fade/slide de 200–300 ms).

### 8.5 Áudio da live (mixado no `/stage`)
- Vozes de quem está no palco (exceto `audioPrivado`) + mídia em reprodução + música de fundo + efeitos + vinhetas, tudo via Web Audio no `/stage`, que é capturado pelo Egress.
- **Ducking:** a música de fundo baixa automaticamente quando alguém fala (ajustável).
- O host ouve a mixagem da live num botão "Ouvir a live" da prévia (fones!), para não confundir com o áudio da sala.

## 9. Interface

Identidade **Xtreamy**: sala de controle escura, profissional e sóbria, com luz de estúdio azul e verde ao fundo e painéis de vidro. Nada de logo, nomes ou textos de outros produtos.

- **Logo:** quadro 16:9 com marcas de área segura e um ponto central que é uma **luz de tally**: degradê azul→verde em repouso, vermelho (pulsando) quando a live está no ar. `components/ui/Marca.tsx` (wordmark "Xtreamy" em Archivo semi-expandida); favicon `app/icon.svg`. O degradê azul→verde é **exclusivo do logo**.
- **Cores** (tokens em `app/globals.css`): fundo `#0A1020` com dois brilhos fixos (azul `#3B82F6` no alto à esquerda, verde `#10B981` embaixo à direita); texto `#E9EDF5` / `#94A0B8`.
  - **Ação:** azul `#3B82F6` (configurável), só para botões, links e foco.
  - **Marca:** verde-esmeralda `#10B981`, que também é a cor de "pronto/ok".
  - **Tally (significado fixo, nunca decorativo):** no ar `#F0453A`, ensaio/intervalo `#F2B33D`, pronto `#10B981`. Mapeamento em `lib/transmissao.ts`, etiqueta em `components/ui/StatusTally.tsx`.
- **Vidro:** utilitários `vidro` (painéis: branco 4,5%, borda branca 9%, blur 20px, fio de luz no topo) e `vidro-forte` (barras fixas e diálogos). Controles secundários: `bg-white/[0.06]` + `ring-white/10`. Campos: `bg-black/20` + `border-white/10`.
- **Tipografia:** Archivo. Títulos em `font-semibold tracking-tight`, tamanhos contidos (nada de títulos gigantes); largura expandida (`fonte-larga`) só no nome Xtreamy. Números tabulares para tempos.
- **Ícones:** Phosphor, peso `fill` (flat). Em Server Components importar de `@phosphor-icons/react/ssr`.
- **Marcas de canto** (área segura) só em volta do que vai ao ar.
- **Texto:** frases simples em português, sem travessões decorativos, sem caixa-alta em rótulos.
- Cantos: `rounded-md` em controles, `rounded-xl` em painéis; foco visível; respeitar `prefers-reduced-motion`.

### 9.1 Home (logado)
- Botão principal **Nova Transmissão** (abre o formulário da 8.1).
- **Destinos**: canais conectados e o botão "Conectar YouTube".
- Lista de transmissões (rascunho, agendadas, encerradas) com "Entrar no estúdio", "Copiar convite" e "Excluir".
- Login/Logout no topo.

### 9.2 Entrar no Estúdio (pré-entrada, host e convidado)
- Prévia da **câmera** (com espelhamento só local) e opção **entrar só com voz**.
- **Controle de som:** escolha do alto-falante + botão "testar som".
- **Controle de microfone:** escolha do microfone + medidor de nível.
- **Configurações:** câmera, resolução, cancelamento de ruído/eco.
- **Nome** (obrigatório) e **Etiqueta** (opcional, ex.: "Comentarista", "@usuario"), usados na etiqueta da live.
- Aviso: "Use fones para evitar eco".
- Botão grande **[Entrar no Estúdio]** (também destrava o áudio no iOS).

### 9.3 Estúdio

```
┌─────────────────────────────────────────────────────────────────┬───────────────┐
│ MENU DE CIMA: título da transmissão · status (Ensaio / ● AO VIVO │ MENU LATERAL  │
│ 00:12:34 / Intervalo) · Destino · [Iniciar] [Intervalo]         │ (abas)        │
│ [Encerrar] · modo diretor (on/off)                               │               │
├─────────────────────────────────────────────────────────────────┤ Comentários   │
│                                                                 │ Banners       │
│        PRÉVIA DA LIVE 16:9 (componente /stage, ao vivo)         │ Ativos de     │
│        botão "Ouvir a live"                                     │  mídia        │
├─────────────────────────────────────────────────────────────────┤ Plano de fundo│
│ DISPOSIÇÕES: layouts padrão · meus layouts · [Editar] [Novo]    │ Música        │
├─────────────────────────────────────────────────────────────────┤ Efeitos       │
│ PESSOAS: cartões com vídeo/avatar, nome e etiqueta              │ Estilos       │
│  No palco | Bastidor                                            │ Widgets       │
│  por pessoa: palco/bastidor · mutar · mutar só p/ ouvintes ·    │ Corte ao vivo │
│  ponto · teleprompter · editar etiqueta · remover               │               │
├─────────────────────────────────────────────────────────────────┤               │
│ BARRA: câmera · microfone · convidar (copiar link) · mutar só   │               │
│ p/ ouvintes · teleprompter · apresentar · configurações · sair  │               │
└─────────────────────────────────────────────────────────────────┴───────────────┘
```

Convidados veem a mesma estrutura **sem** o menu lateral de produção, sem as disposições e sem os controles das outras pessoas. Eles têm: prévia, seu estado (palco/bastidor), barra própria, teleprompter (se recebido) e o chat interno.

### 9.4 Menu lateral (abas do host)
1. **Comentários:** duas sub-abas.
   - *YouTube:* chat ao vivo; clicar → "Mostrar na tela" / "Ocultar".
   - *Estúdio:* chat interno da sala (equipe e convidados), nunca vai para a live. Mensagens também podem ser destacadas se o host quiser.
2. **Banners:** criar, salvar e mostrar/ocultar; estilos faixa fixa ou letreiro rolando.
3. **Ativos de mídia:**
   - *Logotipo* (com posição), *Overlay* (PNG transparente por cima de tudo), *Vinhetas* (vídeo curto com áudio, tocado por cima e removido ao terminar).
   - *Mídias* organizadas por momento: **Iniciar**, **Volto logo**, **Finalizar** e outras. Mostrar, tocar/pausar, tela cheia.
4. **Plano de fundo:** cor, imagem ou vídeo em loop.
5. **Música de fundo:** playlist dos ativos de música, play/pausa/próxima, volume, ducking liga/desliga.
6. **Efeitos sonoros:** grade de botões (soundboard) para disparo único; volume geral.
7. **Estilos:**
   - *Câmera:* borda (espessura, cor), formato (retângulo, arredondado, círculo).
   - *Cor da marca* (primária e secundária).
   - *Tema* das etiquetas/banners/comentários: **bubble**, **minimal**, **classic**, **block**.
   - *Fontes* (lista curada do Google Fonts).
   - Salvar como estilo reutilizável.
8. **Widgets:**
   - *Enquetes:* pergunta + opções, votação pelo chat do YouTube (ex.: o espectador digita `1`, `2`…), resultado ao vivo na tela; abrir/fechar votação.
   - *QR Code:* gerado a partir de uma URL, com legenda e posição.
   - *Manchete:* chamada destacada ("AGORA:", "ÚLTIMA HORA:") com texto livre.
9. **Corte ao vivo (só marcação):** botões **últimos 1 / 2 / 5 / 10 min** ou personalizado, com nome e nota opcionais. Registra apenas o **tempo de início e fim**, sem gravar nem exportar vídeo. Lista de marcações da transmissão com tempos (`01:23:45 → 01:25:45`), link do YouTube já no ponto certo, editar/excluir e **exportar a lista** (copiar texto e CSV) para quem vai editar os cortes depois. Disponível também na Home, em cada transmissão encerrada.

### 9.5 Mobile
Layout de uma coluna, botões grandes; esconder "Apresentar" quando o navegador não suportar compartilhamento de tela. O estúdio do host é pensado para desktop; no celular o host tem uma versão simplificada (palco/bastidor, layouts e iniciar/encerrar).

## 10. Integrações e partes delicadas

### 10.1 YouTube
- OAuth separado do login ("Conectar YouTube"), com refresh token guardado criptografado.
- Criar broadcast + stream + bind na Nova Transmissão; transições de status no Iniciar/Encerrar.
- Chat: `liveChatMessages.list` com o `liveChatId`, **respeitando `pollingIntervalMillis`**. A cota diária da API é limitada, então nunca fazer polling mais rápido que o indicado e parar quando a live terminar. O polling roda **no servidor** (um por transmissão) e repassa as mensagens à sala por *data message*.

### 10.2 Enquetes pelo chat
Contar só o **primeiro voto válido por autor** (`authorChannelId`) enquanto a votação estiver aberta.

### 10.3 Uploads
Limitar tamanho e tipos (imagens PNG/JPG/WebP, vídeos MP4/WebM, áudios MP3/WAV/OGG). Vídeos pesados afetam o `/stage`, então recomendar 1080p ou menos.

### 10.4 Corte ao vivo (marcação de tempo)
- **Não grava, não corta e não exporta vídeo.** Só registra o trecho para edição posterior.
- Referência de tempo: o `actualStartTime` do broadcast no YouTube (obtido pela API ao iniciar), para que os tempos batam com o vídeo gravado no canal. O relógio é do **servidor**, não do navegador.
- `POST /api/corte` com `minutos`: o servidor calcula `fim_seg = agora − actualStartTime` e `inicio_seg = max(0, fim_seg − minutos×60)` e salva em `cortes`.
- Ajuste fino opcional: um **deslocamento** configurável (ex.: −10 s) para compensar o atraso da live.
- Link gerado: `https://youtu.be/{broadcastId}?t={inicio_seg}`.
- Exportação: texto (`[nome] 01:23:45 → 01:25:45 – link`) e CSV (nome, início, fim, duração, link, nota).
- Todos com papel de host podem marcar. Convidados não (avaliar depois).

## 11. Checklist de teste manual (rodar a cada etapa)

- [ ] Chrome desktop, Safari do iPhone e Chrome do Android.
- [ ] Sempre com **fones** nos testes de áudio.
- [ ] Pelo menos 2 dispositivos reais, não só duas abas.
- [ ] Recarregar a página no meio: a pessoa volta para o mesmo estado?
- [ ] Rede ruim simulada (DevTools → throttling) no convidado.
- [ ] Depois de cada live de teste, **assistir à gravação no YouTube** para confirmar o que realmente foi ao ar (principalmente bastidor, mutar só p/ ouvintes, ponto e teleprompter, que **não** podem aparecer).

## 12. Roteiro de etapas

Cada etapa só está concluída quando o critério de "Pronto" for testado de verdade.

| # | Etapa | Pronto quando… |
|---|---|---|
| 0 | Base: Next + TS + Tailwind, Supabase configurado, `.env.example`, deploy na Vercel | Página inicial no ar na Vercel |
| 1 | Login + Home (Nova Transmissão salva no banco, lista, link de convite) | Criar transmissão e copiar o convite |
| 2 | Entrar no Estúdio: câmera, som, microfone, configs, nome/etiqueta, só voz | Prévia e medidor funcionam no celular e no desktop |
| 3 | Sala + papéis host/convidado + barra (câmera, mic, convidar, sair) | 3 pessoas na sala; convidado não vê controles de host |
| 4 | Cena + `/stage` + prévia + layouts padrão + palco/bastidor + cartões só voz | Trocar layout e mover pessoas muda a prévia ao vivo para todos |
| 5 | Destino YouTube: OAuth, criar broadcast/stream automaticamente | Transmissão criada aparece no YouTube Studio sem copiar chave |
| 6 | Iniciar / Intervalo / Encerrar (Egress → RTMP) | Live não listada estável por 30 min, com intervalo e retomada |
| 7 | Mutar só p/ ouvintes + ponto + modo diretor | Gravação confirma que nada privado vazou |
| 8 | Comentários: YouTube + chat interno + destacar na tela | Comentário real aparece no layout |
| 9 | Estilos (câmera, cor, temas, fontes) + etiquetas + banners | Trocar tema muda etiquetas e banners na live |
| 10 | Ativos de mídia: logo, overlay, plano de fundo, mídias (iniciar/volto logo/finalizar), vinhetas | Vídeo "volto logo" com som toca na live |
| 11 | Áudio da live: música de fundo com ducking + efeitos sonoros | Música baixa quando alguém fala; efeito toca uma vez |
| 12 | Apresentar (tela) + layout de apresentação | Tela compartilhada + câmeras na live |
| 13 | Teleprompter | Texto rola só na tela do participante, nunca na live |
| 14 | Editor de layouts (editar e novo) | Layout criado no editor é salvo e usado na live |
| 15 | Widgets: QR Code, manchete, enquetes pelo chat | Enquete recebe votos reais do chat do YouTube |
| 16 | Corte ao vivo (marcação de tempo + lista + exportar) | Marcação "últimos 2 min" abre o vídeo do YouTube no trecho certo |
| 17 | Robustez: reconexão, aviso de rede, erros, encerrar egress esquecido, ensaio geral | Live de ensaio completa com 5+ pessoas sem intervenção técnica |

**Marco 1 (substitui o StreamYard no básico):** etapas 0–8.

## 13. Cuidados técnicos conhecidos

- **iOS/Safari:** áudio só toca após gesto do usuário. Usar o botão "Entrar no Estúdio" para destravar (`startAudio`).
- **Compartilhar tela no celular** praticamente não é suportado; esconder o botão.
- **Eco:** fones recomendados; cancelamento de eco do navegador ligado.
- **Privacidade do áudio:** a garantia de bastidor, mutar só p/ ouvintes e ponto é o `/stage` não tocar aquele áudio. Testar ouvindo a live de verdade.
- **Tokens:** expiração curta, identity única por pessoa; nome e etiqueta vão em `name`/metadata, não na identity.
- **Egress tem custo por minuto no LiveKit Cloud.** Encerrar automaticamente se a sala esvaziar ou se a transmissão ficar em ensaio sem uso.
- **Chave RTMP e tokens do Google** nunca vão ao cliente.
- **Mídias no `/stage`** precisam estar pré-carregadas antes de "Mostrar", para não travar a live.

## 14. Fora do escopo (por enquanto)

Multistream (vários destinos ao mesmo tempo), gravação local em alta qualidade por participante, várias equipes/organizações, app nativo e servidor LiveKit próprio (avaliar só depois que o Marco 1 estiver estável).
