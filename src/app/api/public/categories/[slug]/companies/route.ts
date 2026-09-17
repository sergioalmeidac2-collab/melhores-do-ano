import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePublicCityId } from '@/lib/publicCity';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const cityId = await resolvePublicCityId(url.searchParams.get('city'));
  if (!cityId) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  const category = await prisma.category.findUnique({
    where: { cityId_slug: { cityId, slug: params.slug } },
  });

  if (!category || !category.active) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  const links = await prisma.categoryCompany.findMany({
    where: { categoryId: category.id, company: { active: true, approved: true } },
    orderBy: { order: 'asc' },
    include: { company: true },
  });

  return NextResponse.json({
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      emoji: category.emoji,
    },
    companies: links.map((l) => ({
      id: l.company.id,
      name: l.company.name,
      slug: l.company.slug,
      description: l.company.description,
      logoUrl: l.company.logoUrl,
      instagram: l.company.instagram,
    })),
  });
}
