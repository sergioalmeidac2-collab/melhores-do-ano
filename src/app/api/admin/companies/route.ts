import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';
import { normalizeInstagram } from '@/lib/instagram';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const companies = await prisma.company.findMany({
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
  const { error } = await requireAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const base = slugify(parsed.data.name);
  let slug = base;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
      instagram: normalizeInstagram(parsed.data.instagram),
      phone: parsed.data.phone || null,
      active: parsed.data.active,
      categories: {
        create: parsed.data.categoryIds.map((categoryId, idx) => ({ categoryId, order: idx })),
      },
    },
    include: { categories: { include: { category: true } } },
  });

  return NextResponse.json({ company });
}
