import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';
import { normalizeInstagram } from '@/lib/instagram';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  instagram: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
  approved: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const existing = await prisma.company.findUnique({ where: { id: params.id } });
  if (!existing || existing.cityId !== cityId) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const { categoryIds, instagram, logoUrl, ...rest } = parsed.data;

  let validCategoryIds: string[] | undefined;
  if (categoryIds) {
    const validCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, cityId: cityId! },
      select: { id: true },
    });
    validCategoryIds = validCategories.map((c) => c.id);
  }

  const company = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...rest,
      logoUrl: logoUrl === '' ? null : logoUrl,
      instagram: instagram !== undefined ? normalizeInstagram(instagram) : undefined,
      ...(validCategoryIds
        ? {
            categories: {
              deleteMany: {},
              create: validCategoryIds.map((categoryId, idx) => ({ categoryId, order: idx })),
            },
          }
        : {}),
    },
    include: { categories: { include: { category: true } } },
  });

  return NextResponse.json({ company });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const existing = await prisma.company.findUnique({ where: { id: params.id } });
  if (!existing || existing.cityId !== cityId) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  }

  const voteCount = await prisma.vote.count({ where: { companyId: params.id } });
  if (voteCount > 0) {
    const company = await prisma.company.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ company, softDeleted: true });
  }

  await prisma.categoryCompany.deleteMany({ where: { companyId: params.id } });
  await prisma.company.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
