# Estúdio

Estúdio de transmissões ao vivo no navegador, integrado ao YouTube. A especificação completa está em [CLAUDE.md](CLAUDE.md).

## Rodar localmente

1. Instale o Node.js 20 ou mais recente.
2. `npm install`
3. Copie `.env.example` para `.env.local` e preencha os valores (nunca envie o `.env.local` ao repositório).
4. `npm run dev` e abra http://localhost:3000

Verificação rápida: http://localhost:3000/api/saude deve responder `{"app":"ok","supabase":"ok"}`.

## Deploy

Vercel, importando este repositório do GitHub. As mesmas variáveis do `.env.local` são cadastradas em Project → Settings → Environment Variables (com `APP_BASE_URL` apontando para o domínio público).
