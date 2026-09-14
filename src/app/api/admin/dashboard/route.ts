import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const validWhere = { status: 'VALID' as const };

  const [totalVotes, totalParticipants, categories, companies, byDay, byHour, bySource] = await Promise.all([
    prisma.vote.count({ where: validWhere }),
    prisma.participant.count(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { votes: { where: validWhere } } },
      },
    }),
    prisma.vote.groupBy({
      by: ['companyId', 'categoryId'],
      where: validWhere,
      _count: { _all: true },
    }),
    prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT to_char("createdAt", 'YYYY-MM-DD') as day, COUNT(*) as count FROM "Vote" WHERE status = 'VALID' GROUP BY day ORDER BY day ASC`,
    ),
    prisma.$queryRawUnsafe<{ hour: string; count: bigint }[]>(
      `SELECT to_char("createdAt", 'HH24') as hour, COUNT(*) as count FROM "Vote" WHERE status = 'VALID' GROUP BY hour ORDER BY hour ASC`,
    ),
    prisma.vote.groupBy({
      by: ['utmSource'],
      where: validWhere,
      _count: { _all: true },
    }),
  ]);

  const companyIds = Array.from(new Set(companies.map((c) => c.companyId)));
  const companyRecords = await prisma.company.findMany({ where: { id: { in: companyIds } } });
  const companyMap = new Map(companyRecords.map((c) => [c.id, c.name]));

  const categoryStats = categories.map((cat) => {
    const companiesInCategory = companies
      .filter((c) => c.categoryId === cat.id)
      .map((c) => ({
        companyId: c.companyId,
        companyName: companyMap.get(c.companyId) ?? 'Empresa',
        votes: c._count._all,
      }))
      .sort((a, b) => b.votes - a.votes);

    const totalInCategory = companiesInCategory.reduce((sum, c) => sum + c.votes, 0);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      totalVotes: totalInCategory,
      ranking: companiesInCategory.map((c) => ({
        ...c,
        percentage: totalInCategory > 0 ? Math.round((c.votes / totalInCategory) * 1000) / 10 : 0,
      })),
    };
  });

  const suspiciousCount = await prisma.vote.count({ where: { status: 'SUSPICIOUS' } });
  const invalidCount = await prisma.vote.count({ where: { status: 'INVALID' } });

  return NextResponse.json({
    totalVotes,
    totalParticipants,
    suspiciousCount,
    invalidCount,
    categoryStats,
    votesByDay: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
    votesByHour: byHour.map((d) => ({ hour: d.hour, count: Number(d.count) })),
    votesBySource: bySource.map((s) => ({ source: s.utmSource ?? 'Direto', count: s._count._all })),
  });
}
