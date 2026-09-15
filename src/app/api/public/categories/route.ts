import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      emoji: true,
      _count: { select: { companies: true } },
    },
  });

  return NextResponse.json({
    categories: categories
      .filter((c) => c._count.companies > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        emoji: c.emoji,
        companyCount: c._count.companies,
      })),
  });
}
