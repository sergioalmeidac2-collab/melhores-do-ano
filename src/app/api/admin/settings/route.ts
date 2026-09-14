import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  let settings = await prisma.eventSettings.findFirst();
  if (!settings) {
    settings = await prisma.eventSettings.create({ data: {} });
  }
  return NextResponse.json({ settings });
}

const updateSchema = z.object({
  eventName: z.string().min(2).max(120).optional(),
  eventYear: z.number().int().optional(),
  city: z.string().max(120).optional(),
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

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  let settings = await prisma.eventSettings.findFirst();
  if (!settings) {
    settings = await prisma.eventSettings.create({ data: {} });
  }

  const { startsAt, endsAt, logoUrl, ...rest } = parsed.data;

  const updated = await prisma.eventSettings.update({
    where: { id: settings.id },
    data: {
      ...rest,
      logoUrl: logoUrl === '' ? null : logoUrl,
      startsAt: startsAt ? new Date(startsAt) : startsAt === null ? null : undefined,
      endsAt: endsAt ? new Date(endsAt) : endsAt === null ? null : undefined,
    },
  });

  return NextResponse.json({ settings: updated });
}
