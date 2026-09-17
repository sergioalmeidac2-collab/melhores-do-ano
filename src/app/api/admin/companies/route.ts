import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';
import { normalizeInstagram } from '@/lib/instagram';

export async function GET() {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const companies = await prisma.company.findMany({
    where: { cityId: cityId! },
    orderBy: { name: 'asc' },
    include: {
      categories: { include: { category: true } },
      _count: { select: { votes: true } },
    },
  });
  return NextResponse.json({ companies });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  instagram: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional().default(true),
  categoryIds: z.array(z.string()).min(1, 'Selecione ao menos uma categoria.'),
});

export async function POST(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const validCategories = await prisma.category.findMany({
    where: { id: { in: parsed.data.categoryIds }, cityId: cityId! },
    select: { id: true },
  });
  if (validCategories.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma categoria válida.' }, { status: 400 });
  }
  const validCategoryIds = new Set(validCategories.map((c) => c.id));

  const base = slugify(parsed.data.name);
  let slug = base;
  let n = 1;
  while (await prisma.company.findUnique({ where: { cityId_slug: { cityId: cityId!, slug } } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const company = await prisma.company.create({
    data: {
      cityId: cityId!,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
      instagram: normalizeInstagram(parsed.data.instagram),
      phone: parsed.data.phone || null,
      active: parsed.data.active,
      categories: {
        create: parsed.data.categoryIds
          .filter((id) => validCategoryIds.has(id))
          .map((categoryId, idx) => ({ categoryId, order: idx })),
      },
    },
    include: { categories: { include: { category: true } } },
  });

  return NextResponse.json({ company });
}
