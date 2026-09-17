import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';

const patchSchema = z.object({
  status: z.enum(['VALID', 'SUSPICIOUS', 'INVALID', 'SKIPPED']).optional(),
  reviewNote: z.string().max(500).optional().nullable(),
  blockPhone: z.boolean().optional(),
  blockSession: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, cityId, error } = await requireCityScope();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const vote = await prisma.vote.findUnique({ where: { id: params.id }, include: { participant: true } });
  if (!vote || vote.cityId !== cityId) {
    return NextResponse.json({ error: 'Voto não encontrado.' }, { status: 404 });
  }

  const updated = await prisma.vote.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote,
    },
  });

  if (parsed.data.blockPhone) {
    await prisma.blockedPhone.upsert({
      where: { phone: vote.participant.phone },
      update: {},
      create: { phone: vote.participant.phone, reason: `Bloqueado via voto ${vote.id}` },
    });
  }

  if (parsed.data.blockSession && vote.sessionId) {
    await prisma.blockedSession.upsert({
      where: { sessionId: vote.sessionId },
      update: {},
      create: { sessionId: vote.sessionId, reason: `Bloqueado via voto ${vote.id}` },
    });
  }

  await prisma.auditLog.create({
    data: {
      adminId: session!.adminId,
      action: 'update_vote_status',
      entity: 'Vote',
      entityId: vote.id,
      metadata: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json({ vote: updated });
}
