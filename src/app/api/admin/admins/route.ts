import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/requireAdmin';

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ admins });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
  role: z.enum(['admin', 'editor']).default('editor'),
});

// Cria um novo acesso administrativo. Papel "editor" é o "admin da cidade":
// mexe em categorias, empresas, votos e origens, mas não em configurações
// globais do evento nem na gestão de outros acessos — isso fica só para
// "admin" (o dono da conta).
export async function POST(req: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: 'Já existe um acesso com esse e-mail.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.admin.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ admin });
}
