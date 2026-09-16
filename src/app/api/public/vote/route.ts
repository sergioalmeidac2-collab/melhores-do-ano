import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateAndNormalizeBrazilPhone } from '@/lib/phone';
import { normalizeInstagram } from '@/lib/instagram';
import { checkRateLimit, getClientIp, hashIp, isPhoneBlocked, isSessionBlocked } from '@/lib/fraud';
import { slugify } from '@/lib/slug';

const voteSchema = z.object({
  categorySlug: z.string().min(1),
  companySlug: z.string().min(1).optional(),
  // "escreva sua opção": voto em uma empresa que ainda não está cadastrada
  // nesta categoria. Cria a empresa como pendente de aprovação do admin.
  newCompanyName: z.string().trim().min(2).max(160).optional(),
  skip: z.boolean().optional().default(false),
  name: z.string().trim().min(3, 'Informe seu nome completo.').max(120),
  phone: z.string().min(10),
  instagram: z.string().max(60).optional().nullable(),
  email: z.string().email().max(160).optional().nullable().or(z.literal('')),
  city: z.string().max(120).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  howFoundOut: z.string().max(160).optional().nullable(),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar os Termos de Participação.' }),
  }),
  consentMarketing: z.boolean().optional().default(false),
  sessionId: z.string().min(8).max(100),
  // antibot
  website: z.string().max(0).optional().default(''), // honeypot: deve vir vazio
  formRenderedAt: z.number(),
  utmSource: z.string().max(80).optional().nullable(),
  utmMedium: z.string().max(80).optional().nullable(),
  utmCampaign: z.string().max(80).optional().nullable(),
  utmContent: z.string().max(80).optional().nullable(),
  utmTerm: z.string().max(80).optional().nullable(),
  sourceSlug: z.string().max(80).optional().nullable(),
});

const MIN_FILL_TIME_MS = 2500;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(json);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Dados inválidos.';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }
  const data = parsed.data;

  // honeypot preenchido -> bot. Fingimos sucesso para não dar dica ao bot.
  if (data.website) {
    return NextResponse.json({ success: true, voteId: 'ok' });
  }

  // preenchido rápido demais -> suspeito, mas registramos como SUSPICIOUS em vez de rejeitar
  const fillTimeMs = Date.now() - data.formRenderedAt;
  const tooFast = fillTimeMs < MIN_FILL_TIME_MS;

  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip);

  const rateLimit = await checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.' },
      { status: 429 },
    );
  }

  const phoneResult = validateAndNormalizeBrazilPhone(data.phone);
  if (!phoneResult.valid || !phoneResult.normalized) {
    return NextResponse.json({ error: phoneResult.error ?? 'Telefone inválido.' }, { status: 400 });
  }
  const normalizedPhone = phoneResult.normalized;

  if (await isPhoneBlocked(normalizedPhone)) {
    return NextResponse.json(
      { error: 'Não foi possível registrar seu voto. Entre em contato com a organização do evento.' },
      { status: 403 },
    );
  }
  if (await isSessionBlocked(data.sessionId)) {
    return NextResponse.json(
      { error: 'Não foi possível registrar seu voto. Entre em contato com a organização do evento.' },
      { status: 403 },
    );
  }

  const settings = await prisma.eventSettings.findFirst();
  if (settings?.votingStatus === 'NOT_STARTED') {
    return NextResponse.json({ error: 'A votação ainda não começou.' }, { status: 403 });
  }
  if (settings?.votingStatus === 'CLOSED') {
    return NextResponse.json({ error: 'A votação já foi encerrada.' }, { status: 403 });
  }

  const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category || !category.active) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  let company: Awaited<ReturnType<typeof prisma.company.findUnique>> = null;
  if (!data.skip) {
    if (data.companySlug) {
      company = await prisma.company.findUnique({ where: { slug: data.companySlug } });
      if (!company || !company.active) {
        return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
      }

      const link = await prisma.categoryCompany.findUnique({
        where: { categoryId_companyId: { categoryId: category.id, companyId: company.id } },
      });
      if (!link) {
        return NextResponse.json({ error: 'Essa empresa não participa dessa categoria.' }, { status: 400 });
      }
    } else if (data.newCompanyName) {
      // Reaproveita se já existe (aprovada ou pendente) uma empresa com esse
      // nome nesta categoria, em vez de criar duplicata a cada voto.
      const existingLink = await prisma.categoryCompany.findFirst({
        where: {
          categoryId: category.id,
          company: { name: { equals: data.newCompanyName, mode: 'insensitive' } },
        },
        include: { company: true },
      });

      if (existingLink) {
        company = existingLink.company;
      } else {
        const base = slugify(data.newCompanyName);
        let slug = base;
        let n = 1;
        while (await prisma.company.findUnique({ where: { slug } })) {
          n += 1;
          slug = `${base}-${n}`;
        }
        company = await prisma.company.create({
          data: {
            name: data.newCompanyName,
            slug,
            approved: false,
            categories: { create: { categoryId: category.id } },
          },
        });
      }
    } else {
      return NextResponse.json({ error: 'Escolha uma empresa ou pule a categoria.' }, { status: 400 });
    }
  }

  const instagram = normalizeInstagram(data.instagram);

  let voteSourceId: string | null = null;
  if (data.sourceSlug) {
    const source = await prisma.voteSource.findUnique({ where: { slug: data.sourceSlug } });
    if (source) voteSourceId = source.id;
  }

  const participant = await prisma.participant.upsert({
    where: { phone: normalizedPhone },
    update: {
      name: data.name,
      instagram: instagram ?? undefined,
      email: data.email || undefined,
      city: data.city || undefined,
      neighborhood: data.neighborhood || undefined,
      howFoundOut: data.howFoundOut || undefined,
      marketingOptIn: data.consentMarketing,
    },
    create: {
      name: data.name,
      phone: normalizedPhone,
      instagram,
      email: data.email || null,
      city: data.city || null,
      neighborhood: data.neighborhood || null,
      howFoundOut: data.howFoundOut || null,
      marketingOptIn: data.consentMarketing,
    },
  });

  const existingVote = await prisma.vote.findUnique({
    where: { participantId_categoryId: { participantId: participant.id, categoryId: category.id } },
  });

  // Pular não é definitivo: quem pulou pode voltar depois e votar de verdade
  // (é literalmente o que a tela de sucesso promete). Só bloqueia de novo se
  // a nova tentativa também for um "pular", ou se já existir um voto real
  // (VALID/SUSPICIOUS) — esse sim é definitivo.
  const canConvertSkipToVote = existingVote?.status === 'SKIPPED' && !data.skip;

  if (existingVote && !canConvertSkipToVote) {
    const message =
      existingVote.status === 'SKIPPED'
        ? 'Você já pulou esta categoria.'
        : 'Você já votou nesta categoria. Cada participante pode votar uma vez por categoria.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const voteData = {
    companyId: company?.id ?? null,
    voteSourceId,
    utmSource: data.utmSource || null,
    utmMedium: data.utmMedium || null,
    utmCampaign: data.utmCampaign || null,
    utmContent: data.utmContent || null,
    utmTerm: data.utmTerm || null,
    ipHash,
    userAgent: req.headers.get('user-agent') ?? null,
    sessionId: data.sessionId,
    status: data.skip ? 'SKIPPED' : tooFast ? 'SUSPICIOUS' : 'VALID',
    consentTerms: data.consentTerms,
    consentMarketing: data.consentMarketing,
  };

  const vote = canConvertSkipToVote
    ? await prisma.vote.update({ where: { id: existingVote!.id }, data: voteData })
    : await prisma.vote.create({
        data: { categoryId: category.id, participantId: participant.id, ...voteData },
      });

  return NextResponse.json({ success: true, voteId: vote.id, skipped: data.skip });
}
