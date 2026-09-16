import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/requireAdmin';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  if (session!.adminId === params.id) {
    return NextResponse.json({ error: 'Você não pode remover seu próprio acesso.' }, { status: 400 });
  }

  const totalAdmins = await prisma.admin.count({ where: { role: 'admin' } });
  const target = await prisma.admin.findUnique({ where: { id: params.id } });
  if (target?.role === 'admin' && totalAdmins <= 1) {
    return NextResponse.json({ error: 'Precisa existir pelo menos um administrador.' }, { status: 400 });
  }

  await prisma.admin.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
