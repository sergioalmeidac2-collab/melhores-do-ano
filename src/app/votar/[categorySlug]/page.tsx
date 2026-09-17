import { prisma } from '@/lib/prisma';
import { resolvePublicCityId } from '@/lib/publicCity';
import { VoteWizard } from '@/components/VoteWizard';

export const dynamic = 'force-dynamic';

export default async function VoteCategoryPage({ params }: { params: { categorySlug: string } }) {
  const cityId = await resolvePublicCityId();
  const category = cityId
    ? await prisma.category.findUnique({ where: { cityId_slug: { cityId, slug: params.categorySlug } } })
    : null;

  if (!category || !category.active) {
    return <VoteWizard categorySlug={params.categorySlug} initialCategory={null} />;
  }

  const links = await prisma.categoryCompany.findMany({
    where: { categoryId: category.id, company: { active: true, approved: true } },
    orderBy: { order: 'asc' },
    include: { company: true },
  });

  return (
    <VoteWizard
      categorySlug={params.categorySlug}
      initialCategory={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        emoji: category.emoji,
      }}
      initialCompanies={links.map((l) => ({
        id: l.company.id,
        name: l.company.name,
        slug: l.company.slug,
        description: l.company.description,
        logoUrl: l.company.logoUrl,
        instagram: l.company.instagram,
      }))}
    />
  );
}
