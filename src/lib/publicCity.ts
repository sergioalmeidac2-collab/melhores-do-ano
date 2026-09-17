import { prisma } from '@/lib/prisma';

// Resolve qual cidade um visitante público está acessando. Por enquanto o
// site não tem URLs por cidade ainda (ex: /cidade/votar) — todo mundo que
// acessa a raiz do site cai na cidade "?city=<slug>" se informado, ou na
// cidade mais antiga (a original, criada antes do multi-cidade existir),
// preservando o comportamento atual para quem já usa o link sem parâmetro.
export async function resolvePublicCityId(citySlug?: string | null): Promise<string | null> {
  if (citySlug) {
    const city = await prisma.city.findUnique({ where: { slug: citySlug } });
    if (city) return city.id;
  }

  const firstCity = await prisma.city.findFirst({ orderBy: { createdAt: 'asc' } });
  return firstCity?.id ?? null;
}
