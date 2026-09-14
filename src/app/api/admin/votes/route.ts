import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import type { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;
  const companyId = url.searchParams.get('companyId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const city = url.searchParams.get('city') || undefined;
  const neighborhood = url.searchParams.get('neighborhood') || undefined;
  const utmSource = url.searchParams.get('utmSource') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') ?? '50'), 200);

  const where: Prisma.VoteWhereInput = {
    categoryId,
    companyId,
    status: status || undefined,
    utmSource,
    createdAt: {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(`${dateTo}T23:59:59`) : undefined,
    },
    participant: {
      city: city ? { contains: city, mode: 'insensitive' } : undefined,
      neighborhood: neighborhood ? { contains: neighborhood, mode: 'insensitive' } : undefined,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    },
  };

  const [votes, total] = await Promise.all([
    prisma.vote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        company: true,
        participant: true,
        voteSource: true,
      },
    }),
    prisma.vote.count({ where }),
  ]);

  return NextResponse.json({ votes, total, page, pageSize });
}
