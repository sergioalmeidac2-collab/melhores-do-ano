import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';
import { formatNormalizedPhone } from '@/lib/phone';

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;

  const votes = await prisma.vote.findMany({
    where: { cityId: cityId!, categoryId },
    orderBy: { createdAt: 'desc' },
    include: { category: true, company: true, participant: true, voteSource: true },
  });

  const header = [
    'ID do voto',
    'Data',
    'Hora',
    'Categoria',
    'Empresa escolhida',
    'Nome',
    'Telefone',
    'Instagram',
    'E-mail',
    'Cidade',
    'Bairro',
    'Origem',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'IP (hash)',
    'Status',
  ];

  const rows = votes.map((v) => {
    const created = v.createdAt;
    return [
      v.id,
      created.toISOString().slice(0, 10),
      created.toISOString().slice(11, 19),
      v.category.name,
      v.company?.name ?? '(pulou)',
      v.participant.name,
      formatNormalizedPhone(v.participant.phone),
      v.participant.instagram ?? '',
      v.participant.email ?? '',
      v.participant.city ?? '',
      v.participant.neighborhood ?? '',
      v.voteSource?.label ?? '',
      v.utmSource ?? '',
      v.utmMedium ?? '',
      v.utmCampaign ?? '',
      v.ipHash.slice(0, 12),
      v.status,
    ]
      .map(csvEscape)
      .join(';');
  });

  const csv = ['﻿' + header.join(';'), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="votos-melhores-do-ano-${Date.now()}.csv"`,
    },
  });
}
