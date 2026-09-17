import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_MS, createSessionToken } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!admin) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  const token = await createSessionToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    cityId: admin.cityId,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
    path: '/',
  });
  return res;
}
