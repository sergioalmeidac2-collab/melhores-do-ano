import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { slugify } from '@/lib/slug';

const bulkSchema = z.object({
  names: z.array(z.string().trim().min(2).max(120)).min(1).max(1000),
});

// Cria várias categorias de uma vez (uma por nome), pulando as que já existem
// (comparação por nome, case-insensitive). Útil para importar uma lista de
// referência de categorias de uma vez, em vez de cadastrar uma por uma.
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const existing = await prisma.category.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

  const uniqueNewNames = Array.from(
    new Set(
      parsed.data.names
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && !existingNames.has(n.toLowerCase())),
    ),
  );

  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  let created = 0;
  for (const name of uniqueNewNames) {
    const base = slugify(name);
    let slug = base;
    let n = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    await prisma.category.create({
      data: { name, slug, order: nextOrder },
    });
    nextOrder += 1;
    created += 1;
  }

  return NextResponse.json({ created, skipped: parsed.data.names.length - created });
}
