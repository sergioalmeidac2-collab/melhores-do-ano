import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';

const schema = z.object({
  names: z.array(z.string().trim().min(1).max(160)).min(1).max(200),
});

async function uniqueCompanySlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// Adiciona empresas (opções) a uma categoria já existente, sem precisar
// passar pela tela de Empresas e marcar a categoria manualmente — útil para
// popular em lote uma categoria recém-importada que ainda não tem opções.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const existingLinks = await prisma.categoryCompany.findMany({
    where: { categoryId: category.id },
    include: { company: true },
  });
  const existingNames = new Set(existingLinks.map((l) => l.company.name.toLowerCase()));
  const maxOrder = Math.max(0, ...existingLinks.map((l) => l.order));

  const names = Array.from(
    new Set(parsed.data.names.map((n) => n.trim()).filter((n) => n && !existingNames.has(n.toLowerCase()))),
  );

  let created = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const companySlug = await uniqueCompanySlug(name);
    await prisma.company.create({
      data: {
        name,
        slug: companySlug,
        categories: { create: { categoryId: category.id, order: maxOrder + i + 1 } },
      },
    });
    created += 1;
  }

  return NextResponse.json({ created, skipped: parsed.data.names.length - created });
}
