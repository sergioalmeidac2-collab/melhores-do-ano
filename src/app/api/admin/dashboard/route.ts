import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';

export async function GET() {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const validWhere = { status: 'VALID' as const, cityId: cityId! };

  const [totalVotes, totalParticipants, categories, companies, byDay, byHour, bySource] = await Promise.all([
    prisma.vote.count({ where: validWhere }),
    prisma.vote.findMany({ where: validWhere, select: { participantId: true }, distinct: ['participantId'] }),
    prisma.category.findMany({
      where: { cityId: cityId!, active: true },
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
      `SELECT to_char("createdAt", 'YYYY-MM-DD') as day, COUNT(*) as count FROM "Vote" WHERE status = 'VALID' AND "cityId" = $1 GROUP BY day ORDER BY day ASC`,
      cityId,
    ),
    prisma.$queryRawUnsafe<{ hour: string; count: bigint }[]>(
      `SELECT to_char("createdAt", 'HH24') as hour, COUNT(*) as count FROM "Vote" WHERE status = 'VALID' AND "cityId" = $1 GROUP BY hour ORDER BY hour ASC`,
      cityId,
    ),
    prisma.vote.groupBy({
      by: ['utmSource'],
      where: validWhere,
      _count: { _all: true },
    }),
  ]);

  const companyIds = Array.from(
    new Set(companies.map((c) => c.companyId).filter((id): id is string => id !== null)),
  );
  const companyRecords = await prisma.company.findMany({ where: { id: { in: companyIds } } });
  const companyMap = new Map(companyRecords.map((c) => [c.id, c.name]));

  const categoryStats = categories.map((cat) => {
    const companiesInCategory = companies
      .filter((c) => c.categoryId === cat.id && c.companyId !== null)
      .map((c) => ({
        companyId: c.companyId as string,
        companyName: companyMap.get(c.companyId as string) ?? 'Empresa',
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

  const suspiciousCount = await prisma.vote.count({ where: { status: 'SUSPICIOUS', cityId: cityId! } });
  const invalidCount = await prisma.vote.count({ where: { status: 'INVALID', cityId: cityId! } });
  const skippedCount = await prisma.vote.count({ where: { status: 'SKIPPED', cityId: cityId! } });

  return NextResponse.json({
    totalVotes,
    totalParticipants: totalParticipants.length,
    suspiciousCount,
    invalidCount,
    skippedCount,
    categoryStats,
    votesByDay: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
    votesByHour: byHour.map((d) => ({ hour: d.hour, count: Number(d.count) })),
    votesBySource: bySource.map((s) => ({ source: s.utmSource ?? 'Direto', count: s._count._all })),
  });
}
