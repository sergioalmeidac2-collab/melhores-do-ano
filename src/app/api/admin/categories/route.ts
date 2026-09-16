import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';
import { guessCategoryEmoji } from '@/lib/categoryEmoji';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { companies: true, votes: true } } },
  });
  return NextResponse.json({ categories });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  emoji: z.string().max(8).optional(),
  active: z.boolean().optional().default(true),
  // opções (empresas) já cadastradas junto com a categoria, ex: "Padaria" ->
  // ["Pão Nosso", "Nossa Padaria", "Santo Pão"]. Cada nome vira uma Company
  // já vinculada a esta categoria, na mesma ordem informada.
  options: z.array(z.string().trim().min(1).max(160)).max(200).optional().default([]),
});

async function uniqueSlug(model: 'category' | 'company', name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (
    model === 'category'
      ? await prisma.category.findUnique({ where: { slug } })
      : await prisma.company.findUnique({ where: { slug } })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const slug = await uniqueSlug('category', parsed.data.name);
  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      emoji:
        parsed.data.emoji && parsed.data.emoji !== '🏆'
          ? parsed.data.emoji
          : guessCategoryEmoji(parsed.data.name),
      active: parsed.data.active,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  const optionNames = Array.from(new Set(parsed.data.options.map((o) => o.trim()).filter(Boolean)));

  for (let i = 0; i < optionNames.length; i++) {
    const name = optionNames[i];
    const companySlug = await uniqueSlug('company', name);
    await prisma.company.create({
      data: {
        name,
        slug: companySlug,
        categories: { create: { categoryId: category.id, order: i } },
      },
    });
  }

  const withCompanies = await prisma.category.findUnique({
    where: { id: category.id },
    include: { _count: { select: { companies: true, votes: true } } },
  });

  return NextResponse.json({ category: withCompanies });
}
