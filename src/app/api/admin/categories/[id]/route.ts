import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  emoji: z.string().max(8).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const { imageUrl, ...rest } = parsed.data;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: { ...rest, imageUrl: imageUrl === '' ? null : imageUrl },
  });

  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const voteCount = await prisma.vote.count({ where: { categoryId: params.id } });
  if (voteCount > 0) {
    // preserva histórico de votos: apenas desativa em vez de excluir
    const category = await prisma.category.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ category, softDeleted: true });
  }

  await prisma.categoryCompany.deleteMany({ where: { categoryId: params.id } });
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
