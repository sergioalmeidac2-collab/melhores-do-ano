# Melhores do Ano

Sistema de votação pública para premiações "Melhores do Ano" — categorias, empresas, votação com antifraude, painel administrativo, dashboard e exportação.

Stack: **Next.js 14 (App Router) + Prisma + PostgreSQL**, pensado para rodar na **Vercel** com banco no **Supabase**.

## Rodando localmente

1. Copie `.env.example` para `.env` e preencha `DATABASE_URL` com a connection string do seu projeto Supabase (Settings → Database → Connection string → modo "Transaction pooler", porta 6543) e um `SESSION_SECRET` aleatório.
2. Instale e prepare o banco:

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

O `seed` cria **apenas** o administrador inicial (nenhuma categoria/empresa fictícia):

- E-mail: `admin@melhoresdoano.com`
- Senha: `TrocarSenha123!`

Troque a senha assim que possível. Acesse:
- `http://localhost:3000` — página pública
- `http://localhost:3000/admin` — painel administrativo

## Cadastrando dados reais

Todo o conteúdo (categorias, empresas, textos do evento, status da votação) é cadastrado pelo administrador em `/admin`. Nenhum dado fictício é inserido automaticamente — a votação só aparece publicamente depois que você:

1. Criar categorias em `/admin/categorias`
2. Criar empresas e associá-las a categorias em `/admin/empresas`
3. Abrir a votação em `/admin/configuracoes` (Status da votação → "Aberta")

Para acelerar o cadastro de categorias, `/admin/categorias` tem um botão "Importar várias categorias de uma vez" pré-preenchido com uma lista de referência de ~50 categorias reais usadas em concursos "Melhores do Ano" municipais (ex: Barbeiro(a), Pizzaria, Contador(a), Clínica Veterinária) — edite a lista antes de importar, nada é criado sem essa confirmação manual.

## Publicando: GitHub → Vercel → Supabase

### 1. Subir o código para o GitHub

O repositório já está inicializado localmente com o primeiro commit. Para subir:

```bash
git remote add origin https://github.com/SEU_USUARIO/melhores-do-ano.git
git push -u origin master
```

(Crie o repositório vazio antes em https://github.com/new — sem README/gitignore, para não conflitar.)

### 2. Importar na Vercel

1. Em https://vercel.com/new, importe o repositório recém-criado.
2. Framework preset: Next.js (detectado automaticamente).
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` — a mesma connection string do Supabase (porta 6543, `?pgbouncer=true`)
   - `SESSION_SECRET` — uma string aleatória longa (gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`)
4. Deploy.

O comando de build (`package.json` → `build`) já roda `prisma generate && prisma migrate deploy && next build`, ou seja, **a cada deploy as migrations pendentes são aplicadas automaticamente** no banco do Supabase. Isso é intencional e simples para este projeto, mas significa que o build falha se `DATABASE_URL` não estiver configurada corretamente.

### 3. Criar o admin em produção

Depois do primeiro deploy, rode o seed uma vez apontando para o banco de produção (do seu computador, com o `.env` local temporariamente configurado com a `DATABASE_URL` de produção):

```bash
npm run seed
```

Ou defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente antes de rodar, para não usar as credenciais padrão.

## Votação por comentários do Instagram (canal alternativo)

Além da votação por formulário web (canal principal), o painel tem uma tela em `/admin/instagram` para lidar com concursos que também recebem votos por **comentário no Instagram** (padrão comum em concursos "Melhores do Ano" municipais: o público comenta mencionando o @ da empresa no post).

Como não há integração automática com a Instagram Graph API nesta versão (exigiria app da Meta aprovado + conta comercial do cliente conectada), o fluxo é manual:

1. Cadastre o @Instagram de cada empresa em `/admin/empresas`.
2. Exporte ou copie os comentários do post da categoria.
3. Cole em `/admin/instagram` no formato `usuario: comentário` (uma linha por comentário).
4. O sistema classifica cada comentário — válido, voto múltiplo (mesmo usuário comentou mais de uma vez), múltiplas menções (ambíguo), sem menção, ou com texto além do voto — e monta o ranking só com os votos válidos.

Isso é independente da votação por formulário: os dois canais não se misturam nem competem pelo mesmo limite de "1 voto por categoria".

### Evoluir para importação automática

Para tirar o "colar manual" do caminho, o passo seguinte seria: criar um app na Meta for Developers, conectar a conta comercial do Instagram do cliente, pedir os escopos `instagram_basic` e `instagram_manage_comments`, passar pela revisão de app da Meta, e assinar um webhook de comentários que chama `parseCommentsBlock`/`classifyComments` (já prontos em `src/lib/instagramVotes.ts`) automaticamente a cada comentário novo, em vez de depender do admin colar texto.

## Arquitetura

- **Next.js 14 (App Router)** — front público + admin + API routes no mesmo projeto
- **Prisma + PostgreSQL** — ORM, schema em `prisma/schema.prisma`, migrations em `prisma/migrations/`
- **Autenticação admin** — cookie de sessão assinado (HMAC via Web Crypto, compatível com Edge Runtime), sem dependência externa
- **Antifraude** — dedupe por telefone normalizado + categoria (`@@unique([participantId, categoryId])`), rate limit por IP, honeypot + tempo mínimo de preenchimento, bloqueio manual de telefone/sessão pelo admin
- **Rastreamento** — UTM capturado na URL de voto, entidade `VoteSource` para gerar links/QR Codes por canal

## O que ainda não está implementado (arquitetura já preparada)

Conforme escopo combinado (MVP funcional primeiro), ficaram para uma próxima iteração:
- Login social (Google/WhatsApp), confirmação de telefone por SMS
- Ranking público e página de vencedores
- Patrocinadores, banners, cupons, sorteio
- Exportação em `.xlsx` nativo (hoje exporta CSV, que o Excel abre normalmente)
- Suporte a "mais de 1 voto por categoria" (campo já existe em Configurações, mas a regra atual do banco força 1; para permitir N, seria necessário trocar a constraint única por uma contagem)
- Enum nativo do Postgres para `votingStatus`/`status` (hoje são `String` validados via Zod na API — funciona, mas um enum de banco daria uma camada extra de garantia)
