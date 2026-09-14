# Melhores do Ano

Sistema de votação pública para premiações "Melhores do Ano" — categorias, empresas, votação com antifraude, painel administrativo, dashboard e exportação.

## Rodando localmente

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

O `seed` cria **apenas** o administrador inicial (nenhuma categoria/empresa fictícia):

- E-mail: `admin@melhoresdoano.com`
- Senha: `TrocarSenha123!`

Troque a senha assim que possível (crie um novo admin e remova o padrão, ou implemente troca de senha no painel).

Acesse:
- `http://localhost:3000` — página pública
- `http://localhost:3000/admin` — painel administrativo

## Cadastrando dados reais

Todo o conteúdo (categorias, empresas, textos do evento, status da votação) é cadastrado pelo administrador em `/admin`. Nenhum dado fictício é inserido automaticamente — a votação só aparece publicamente depois que você:

1. Criar categorias em `/admin/categorias`
2. Criar empresas e associá-las a categorias em `/admin/empresas`
3. Abrir a votação em `/admin/configuracoes` (Status da votação → "Aberta")

## Indo para produção (Vercel + Supabase)

1. Crie um projeto Postgres no Supabase.
2. Em `prisma/schema.prisma`, troque `provider = "sqlite"` para `provider = "postgresql"` no bloco `datasource`.
3. Ajuste as duas queries `$queryRawUnsafe` em `src/app/api/admin/dashboard/route.ts` (comentário no topo do arquivo explica a troca de sintaxe SQLite → Postgres).
4. Configure as variáveis de ambiente na Vercel:
   - `DATABASE_URL`: connection string do Supabase (use a porta do *pooler*, 6543, para ambiente serverless)
   - `SESSION_SECRET`: string aleatória longa (`openssl rand -base64 48`)
5. Rode `npx prisma migrate dev --name init` localmente contra o Postgres para gerar as migrations, depois `npx prisma migrate deploy` no deploy.
6. Rode o seed do admin uma vez contra o banco de produção.

## Arquitetura

- **Next.js 14 (App Router)** — front público + admin + API routes no mesmo projeto
- **Prisma** — ORM, schema em `prisma/schema.prisma`
- **Autenticação admin** — cookie de sessão assinado (HMAC via Web Crypto), sem dependência externa
- **Antifraude** — dedupe por telefone normalizado + categoria (`@@unique([participantId, categoryId])`), rate limit por IP, honeypot + tempo mínimo de preenchimento, bloqueio manual de telefone/sessão pelo admin
- **Rastreamento** — UTM capturado na URL de voto, entidade `VoteSource` para gerar links/QR Codes por canal

## O que ainda não está implementado (arquitetura já preparada)

Conforme escopo combinado (MVP funcional primeiro), ficaram para uma próxima iteração:
- Login social (Google/WhatsApp), confirmação de telefone por SMS
- Ranking público e página de vencedores
- Patrocinadores, banners, cupons, sorteio
- Exportação em `.xlsx` nativo (hoje exporta CSV, que o Excel abre normalmente)
- Suporte a "mais de 1 voto por categoria" (campo já existe em Configurações, mas a regra atual do banco força 1; para permitir N, seria necessário trocar a constraint única por uma contagem)
