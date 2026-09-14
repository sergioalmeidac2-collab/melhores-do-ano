import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let settings = await prisma.eventSettings.findFirst();

  if (!settings) {
    settings = await prisma.eventSettings.create({ data: {} });
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
    city: settings.city,
    logoUrl: settings.logoUrl,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    primaryColor: settings.primaryColor,
    votingStatus: status,
    startsAt: settings.startsAt,
    endsAt: settings.endsAt,
  });
}
