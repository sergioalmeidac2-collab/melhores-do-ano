import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/requireAdmin';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  state: z.string().trim().max(2).optional(),
  active: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const city = await prisma.city.update({
    where: { id: params.id },
    data: { ...parsed.data, state: parsed.data.state?.toUpperCase() },
  });

  return NextResponse.json({ city });
}

// Apagar uma cidade apaga TUDO dela (categorias, empresas, votos...) via
// cascade — reservado para limpar cidades de teste. Sem confirmação dupla
// aqui porque o cliente (UI) já confirma antes de chamar.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const remaining = await prisma.city.count();
  if (remaining <= 1) {
    return NextResponse.json({ error: 'Precisa existir pelo menos uma cidade.' }, { status: 400 });
  }

  await prisma.city.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
