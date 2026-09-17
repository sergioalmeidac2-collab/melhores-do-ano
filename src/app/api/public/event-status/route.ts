import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePublicCityId } from '@/lib/publicCity';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityId = await resolvePublicCityId(url.searchParams.get('city'));
  if (!cityId) {
    return NextResponse.json({ error: 'Nenhuma cidade cadastrada ainda.' }, { status: 404 });
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  let settings = await prisma.eventSettings.findUnique({ where: { cityId } });
  if (!settings) {
    settings = await prisma.eventSettings.create({ data: { cityId } });
  }

  // status automático por data, se habilitado
  let status = settings.votingStatus;
  if (settings.autoSchedule) {
    const now = new Date();
    if (settings.startsAt && now < settings.startsAt) status = 'NOT_STARTED';
    else if (settings.endsAt && now > settings.endsAt) status = 'CLOSED';
    else if (settings.startsAt && now >= settings.startsAt) status = 'OPEN';
  }

  return NextResponse.json({
    eventName: settings.eventName,
    eventYear: settings.eventYear,
    city: city?.name ?? null,
    state: city?.state ?? null,
    logoUrl: settings.logoUrl,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    primaryColor: settings.primaryColor,
    votingStatus: status,
    startsAt: settings.startsAt,
    endsAt: settings.endsAt,
  });
}
