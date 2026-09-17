import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';

export async function GET() {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const sources = await prisma.voteSource.findMany({
    where: { cityId: cityId! },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json({ sources });
}

const createSchema = z.object({
  label: z.string().trim().min(2).max(120),
  utmSource: z.string().max(80).optional().nullable(),
  utmMedium: z.string().max(80).optional().nullable(),
  utmCampaign: z.string().max(80).optional().nullable(),
  utmContent: z.string().max(80).optional().nullable(),
  utmTerm: z.string().max(80).optional().nullable(),
});

export async function POST(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const base = slugify(parsed.data.label);
  let slug = base;
  let n = 1;
  while (await prisma.voteSource.findUnique({ where: { cityId_slug: { cityId: cityId!, slug } } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const source = await prisma.voteSource.create({
    data: { ...parsed.data, cityId: cityId!, slug },
  });

  return NextResponse.json({ source });
}
