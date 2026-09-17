import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireSuperAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';

// GET: qualquer admin autenticado pode listar (o seletor de cidade do painel
// precisa disso) — mas um "editor" só vê a própria cidade.
export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const cities = await prisma.city.findMany({
    where: session!.cityId ? { id: session!.cityId } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { categories: true, votes: true } } },
  });

  return NextResponse.json({ cities });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  state: z.string().trim().max(2).optional().default(''),
});

// Cria uma cidade nova (= um novo "contrato"/LP) já com as configurações
// padrão do evento. Só o admin dono da plataforma pode fazer isso.
export async function POST(req: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const base = slugify(parsed.data.name);
  let slug = base;
  let n = 1;
  while (await prisma.city.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const city = await prisma.city.create({
    data: {
      name: parsed.data.name,
      slug,
      state: parsed.data.state.toUpperCase(),
      eventSettings: {
        create: {
          heroTitle: 'MELHORES DO ANO',
          heroSubtitle: 'Escolha as empresas que mais se destacaram na sua cidade.',
        },
      },
    },
  });

  return NextResponse.json({ city });
}
