import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';

export async function GET() {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const settings = await prisma.eventSettings.findUnique({ where: { cityId: cityId! } });
  return NextResponse.json({ settings });
}

const updateSchema = z.object({
  eventName: z.string().min(2).max(120).optional(),
  eventYear: z.number().int().optional(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  heroTitle: z.string().max(160).optional(),
  heroSubtitle: z.string().max(300).optional(),
  primaryColor: z.string().max(20).optional(),
  rulesText: z.string().max(5000).optional(),
  votesPerCategory: z.number().int().min(1).max(10).optional(),
  votingStatus: z.enum(['NOT_STARTED', 'OPEN', 'CLOSED']).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  autoSchedule: z.boolean().optional(),
});

// Configurações de evento agora são por cidade — um "editor" (admin de
// cidade) também pode ajustar as configurações da própria cidade; só a
// gestão de cidades em si (criar/apagar/renomear) é exclusiva do super admin.
export async function PUT(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const { startsAt, endsAt, logoUrl, ...rest } = parsed.data;

  const updated = await prisma.eventSettings.upsert({
    where: { cityId: cityId! },
    create: {
      cityId: cityId!,
      ...rest,
      logoUrl: logoUrl || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
    update: {
      ...rest,
      logoUrl: logoUrl === '' ? null : logoUrl,
      startsAt: startsAt ? new Date(startsAt) : startsAt === null ? null : undefined,
      endsAt: endsAt ? new Date(endsAt) : endsAt === null ? null : undefined,
    },
  });

  return NextResponse.json({ settings: updated });
}
