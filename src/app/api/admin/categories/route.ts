import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';

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
  emoji: z.string().max(8).optional(),
  active: z.boolean().optional().default(true),
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
  while (await prisma.category.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      emoji: parsed.data.emoji || '🏆',
      active: parsed.data.active,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ category });
}
