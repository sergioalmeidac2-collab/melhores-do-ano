-- Multi-cidade: introduz a tabela "City" e migra os dados existentes (que
-- pertenciam a um único evento implícito) para uma cidade padrão, sem perder
-- nada. Escrita à mão (não gerada por `prisma migrate diff`) porque precisa
-- fazer backfill de dados no meio das alterações estruturais.

-- 1. Cria a tabela City
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- 2. Cria a cidade padrão para "abrigar" todos os dados que já existiam
--    antes do conceito de cidade existir. Nome genérico de propósito — o
--    admin edita em /admin/cidades assim que quiser.
INSERT INTO "City" ("id", "name", "slug", "state", "active", "createdAt")
VALUES ('default_city', 'Minha Cidade', 'minha-cidade', '', true, CURRENT_TIMESTAMP);

-- 3. Category: adiciona cityId (nullable), preenche, torna obrigatório
ALTER TABLE "Category" ADD COLUMN "cityId" TEXT;
UPDATE "Category" SET "cityId" = 'default_city' WHERE "cityId" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Category_slug_key";
DROP INDEX "Category_active_order_idx";
CREATE UNIQUE INDEX "Category_cityId_slug_key" ON "Category"("cityId", "slug");
CREATE INDEX "Category_cityId_active_order_idx" ON "Category"("cityId", "active", "order");

-- 4. Company: idem
ALTER TABLE "Company" ADD COLUMN "cityId" TEXT;
UPDATE "Company" SET "cityId" = 'default_city' WHERE "cityId" IS NULL;
ALTER TABLE "Company" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "Company" ADD CONSTRAINT "Company_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Company_slug_key";
CREATE UNIQUE INDEX "Company_cityId_slug_key" ON "Company"("cityId", "slug");

-- 5. VoteSource: idem
ALTER TABLE "VoteSource" ADD COLUMN "cityId" TEXT;
UPDATE "VoteSource" SET "cityId" = 'default_city' WHERE "cityId" IS NULL;
ALTER TABLE "VoteSource" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "VoteSource" ADD CONSTRAINT "VoteSource_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "VoteSource_slug_key";
CREATE UNIQUE INDEX "VoteSource_cityId_slug_key" ON "VoteSource"("cityId", "slug");

-- 6. Vote: adiciona cityId (denormalizado para consultas/índices do admin)
ALTER TABLE "Vote" ADD COLUMN "cityId" TEXT;
UPDATE "Vote" SET "cityId" = 'default_city' WHERE "cityId" IS NULL;
ALTER TABLE "Vote" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Vote_categoryId_companyId_idx";
CREATE INDEX "Vote_cityId_categoryId_companyId_idx" ON "Vote"("cityId", "categoryId", "companyId");

-- 7. Admin: cityId opcional (NULL = admin dono, vê todas as cidades)
ALTER TABLE "Admin" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- admins existentes continuam sem cityId -> viram automaticamente "admin
-- dono da plataforma", o que é o comportamento correto (eram os únicos
-- admins do único evento que existia).

-- 8. EventSettings: liga a uma cidade (1 por cidade) em vez de campos soltos
--    de cidade/estado
ALTER TABLE "EventSettings" ADD COLUMN "cityId" TEXT;
UPDATE "EventSettings" SET "cityId" = 'default_city' WHERE "cityId" IS NULL;
-- se a linha já tinha cidade/estado preenchidos, herda pra tabela City
UPDATE "City" SET
  "name" = COALESCE(NULLIF((SELECT "city" FROM "EventSettings" LIMIT 1), ''), "City"."name"),
  "state" = COALESCE(NULLIF((SELECT "state" FROM "EventSettings" LIMIT 1), ''), "City"."state")
WHERE "id" = 'default_city';
ALTER TABLE "EventSettings" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "EventSettings" ADD CONSTRAINT "EventSettings_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "EventSettings_cityId_key" ON "EventSettings"("cityId");
ALTER TABLE "EventSettings" DROP COLUMN "city";
ALTER TABLE "EventSettings" DROP COLUMN "state";
