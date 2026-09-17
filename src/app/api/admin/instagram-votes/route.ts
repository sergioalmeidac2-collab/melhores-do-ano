import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';
import { classifyComments, parseCommentsBlock } from '@/lib/instagramVotes';
import { normalizeInstagram } from '@/lib/instagram';

// GET: resumo + ranking de uma categoria já analisada
export async function GET(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId');
  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId é obrigatório.' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.cityId !== cityId) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  const rows = await prisma.instagramCommentVote.findMany({
    where: { categoryId },
    orderBy: { createdAt: 'desc' },
  });

  const companyIds = Array.from(new Set(rows.map((r) => r.companyId).filter((id): id is string => !!id)));
  const companyRecords = await prisma.company.findMany({ where: { id: { in: companyIds } } });
  const companyMap = new Map(companyRecords.map((c) => [c.id, c.name]));

  const summary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'VALID').length,
    extraText: rows.filter((r) => r.status === 'EXTRA_TEXT').length,
    multipleVote: rows.filter((r) => r.status === 'MULTIPLE_VOTE').length,
    multipleMention: rows.filter((r) => r.status === 'MULTIPLE_MENTION').length,
    noMention: rows.filter((r) => r.status === 'NO_MENTION').length,
  };

  const validRows = rows.filter((r) => r.status === 'VALID' || r.status === 'EXTRA_TEXT');
  const countByCompany = new Map<string, number>();
  for (const r of validRows) {
    if (!r.companyId) continue;
    countByCompany.set(r.companyId, (countByCompany.get(r.companyId) ?? 0) + 1);
  }
  const totalValid = validRows.length;
  const ranking = Array.from(countByCompany.entries())
    .map(([companyId, votes]) => ({
      companyId,
      companyName: companyMap.get(companyId) ?? 'Empresa',
      votes,
      percentage: totalValid > 0 ? Math.round((votes / totalValid) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return NextResponse.json({
    summary,
    ranking,
    comments: rows.map((r) => ({
      id: r.id,
      username: r.username,
      rawText: r.rawText,
      status: r.status,
      companyName: r.companyId ? (companyMap.get(r.companyId) ?? 'Empresa') : null,
      createdAt: r.createdAt,
    })),
  });
}

const analyzeSchema = z.object({
  categoryId: z.string().min(1),
  rawComments: z.string().min(1, 'Cole ao menos um comentário.'),
  replace: z.boolean().optional().default(true),
});

// POST: recebe um bloco de texto com comentários colados, classifica e persiste
export async function POST(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const json = await req.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category || category.cityId !== cityId) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }

  const links = await prisma.categoryCompany.findMany({
    where: { categoryId: category.id },
    include: { company: true },
  });

  const handleToCompanyId = new Map<string, string>();
  for (const link of links) {
    const handle = normalizeInstagram(link.company.instagram);
    if (handle) {
      handleToCompanyId.set(handle.replace(/^@/, ''), link.companyId);
    }
  }

  if (handleToCompanyId.size === 0) {
    return NextResponse.json(
      { error: 'Nenhuma empresa desta categoria tem @Instagram cadastrado. Cadastre o Instagram das empresas antes de analisar comentários.' },
      { status: 400 },
    );
  }

  const comments = parseCommentsBlock(parsed.data.rawComments);
  if (comments.length === 0) {
    return NextResponse.json(
      { error: 'Não consegui reconhecer nenhum comentário. Use o formato "usuario: comentário" (uma linha por comentário).' },
      { status: 400 },
    );
  }

  const classified = classifyComments(comments, handleToCompanyId);

  if (parsed.data.replace) {
    await prisma.instagramCommentVote.deleteMany({ where: { categoryId: category.id } });
  }

  await prisma.instagramCommentVote.createMany({
    data: classified.map((c) => ({
      categoryId: category.id,
      companyId: c.companyId,
      username: c.username,
      rawText: c.text,
      status: c.status,
    })),
  });

  return NextResponse.json({ success: true, analyzed: classified.length });
}
