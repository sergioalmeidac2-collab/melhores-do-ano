import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateAndNormalizeBrazilPhone } from '@/lib/phone';
import { normalizeInstagram } from '@/lib/instagram';
import { resolvePublicCityId } from '@/lib/publicCity';

export const dynamic = 'force-dynamic';

// GET /api/public/participant?phone=... — usado pelo "login" simples por
// telefone: devolve os dados do participante (se já existir) e o progresso
// dele em cada categoria ativa (votou / pulou / pendente). Não expõe em qual
// empresa ele votou nem ranking nenhum — só o próprio status.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawPhone = url.searchParams.get('phone');
  if (!rawPhone) {
    return NextResponse.json({ error: 'Informe o telefone.' }, { status: 400 });
  }

  const phoneResult = validateAndNormalizeBrazilPhone(rawPhone);
  if (!phoneResult.valid || !phoneResult.normalized) {
    return NextResponse.json({ error: phoneResult.error ?? 'Telefone inválido.' }, { status: 400 });
  }

  const cityId = await resolvePublicCityId(url.searchParams.get('city'));

  const participant = await prisma.participant.findUnique({
    where: { phone: phoneResult.normalized },
    include: { votes: { select: { categoryId: true, status: true } } },
  });

  const categories = cityId
    ? await prisma.category.findMany({
        where: { active: true, cityId },
        orderBy: { order: 'asc' },
        include: { _count: { select: { companies: true } } },
      })
    : [];

  const voteByCategory = new Map(participant?.votes.map((v) => [v.categoryId, v.status]) ?? []);

  const votedCategoryIds = categories
    .filter((c) => voteByCategory.get(c.id) && voteByCategory.get(c.id) !== 'SKIPPED')
    .map((c) => c.id);

  // Só mostramos o ranking das categorias em que a pessoa já votou de
  // verdade — quem ainda não votou (ou só pulou) não vê nenhum número, pra
  // não influenciar a decisão de voto de ninguém.
  const voteCounts = votedCategoryIds.length
    ? await prisma.vote.groupBy({
        by: ['categoryId', 'companyId'],
        where: { categoryId: { in: votedCategoryIds }, status: 'VALID', companyId: { not: null } },
        _count: { _all: true },
      })
    : [];

  const companyIds = Array.from(new Set(voteCounts.map((v) => v.companyId).filter((id): id is string => !!id)));
  const companies = companyIds.length
    ? await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
    : [];
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  const rankingByCategory = new Map<string, { companyId: string; companyName: string; votes: number; percentage: number }[]>();
  for (const categoryId of votedCategoryIds) {
    const rows = voteCounts.filter((v) => v.categoryId === categoryId);
    const total = rows.reduce((sum, r) => sum + r._count._all, 0);
    const ranking = rows
      .map((r) => ({
        companyId: r.companyId as string,
        companyName: companyNameById.get(r.companyId as string) ?? 'Empresa',
        votes: r._count._all,
        percentage: total > 0 ? Math.round((r._count._all / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.votes - a.votes);
    rankingByCategory.set(categoryId, ranking);
  }

  const progress = categories
    .filter((c) => c._count.companies > 0)
    .map((c) => {
      const status = voteByCategory.get(c.id);
      const votedForReal = !!status && status !== 'SKIPPED';
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        imageUrl: c.imageUrl,
        status: status === 'SKIPPED' ? 'SKIPPED' : status ? 'VOTED' : 'PENDING',
        ranking: votedForReal ? (rankingByCategory.get(c.id) ?? []) : null,
      };
    });

  return NextResponse.json({
    participant: participant
      ? {
          name: participant.name,
          phone: participant.phone,
          instagram: participant.instagram,
          email: participant.email,
        }
      : null,
    categories: progress,
  });
}

const registerSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome completo.').max(120),
  phone: z.string().min(10),
  instagram: z.string().max(60).optional().nullable(),
  email: z.string().email().max(160).optional().nullable().or(z.literal('')),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar os Termos de Participação.' }),
  }),
  consentMarketing: z.boolean().optional().default(false),
});

// POST /api/public/participant — "primeiro acesso": cria o cadastro do
// participante (sem votar em nada ainda) para então mostrar o checklist de
// categorias. Se o telefone já existir, apenas devolve o cadastro existente
// sem sobrescrever os dados.
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const phoneResult = validateAndNormalizeBrazilPhone(parsed.data.phone);
  if (!phoneResult.valid || !phoneResult.normalized) {
    return NextResponse.json({ error: phoneResult.error ?? 'Telefone inválido.' }, { status: 400 });
  }

  const existing = await prisma.participant.findUnique({ where: { phone: phoneResult.normalized } });
  if (existing) {
    return NextResponse.json({
      participant: {
        name: existing.name,
        phone: existing.phone,
        instagram: existing.instagram,
        email: existing.email,
      },
    });
  }

  const participant = await prisma.participant.create({
    data: {
      name: parsed.data.name,
      phone: phoneResult.normalized,
      instagram: normalizeInstagram(parsed.data.instagram),
      email: parsed.data.email || null,
      marketingOptIn: parsed.data.consentMarketing,
    },
  });

  return NextResponse.json({
    participant: {
      name: participant.name,
      phone: participant.phone,
      instagram: participant.instagram,
      email: participant.email,
    },
  });
}
