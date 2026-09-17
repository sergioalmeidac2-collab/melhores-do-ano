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
    select: { id: true, name: true, email: true, role: true, cityId: true, city: { select: { name: true } }, createdAt: true },
  });
  return NextResponse.json({ admins });
}

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    role: z.enum(['admin', 'editor']).default('editor'),
    cityId: z.string().min(1).optional(),
  })
  .refine((data) => data.role !== 'editor' || !!data.cityId, {
    message: 'Selecione a cidade que este acesso vai administrar.',
    path: ['cityId'],
  });

// Cria um novo acesso administrativo. Papel "editor" é o "admin da cidade":
// preso a uma cidade (cityId obrigatório), mexe em categorias, empresas,
// votos, origens e configurações daquela cidade — mas não em outras cidades
// nem na gestão de acessos. "admin" é o dono da plataforma (cityId nulo),
// enxerga e gerencia todas as cidades.
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

  if (parsed.data.role === 'editor') {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return NextResponse.json({ error: 'Cidade não encontrada.' }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.admin.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      cityId: parsed.data.role === 'editor' ? parsed.data.cityId : null,
    },
    select: { id: true, name: true, email: true, role: true, cityId: true, createdAt: true },
  });

  return NextResponse.json({ admin });
}
