import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/requireAdmin';
import { CURRENT_CITY_COOKIE_NAME } from '@/lib/requireAdmin';

const schema = z.object({ cityId: z.string().min(1) });

// Só o admin dono da plataforma usa isso — o seletor de cidade do painel
// grava qual cidade ele quer gerenciar agora num cookie. Um "editor" nunca
// chama isso (não tem seletor, a cidade dele já vem fixa na sessão).
export async function POST(req: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'cityId é obrigatório.' }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city) {
    return NextResponse.json({ error: 'Cidade não encontrada.' }, { status: 404 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(CURRENT_CITY_COOKIE_NAME, city.id, {
    httpOnly: false, // o client-side precisa ler pra refletir na UI sem round-trip
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return res;
}
