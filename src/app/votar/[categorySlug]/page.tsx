import { VoteWizard } from '@/components/VoteWizard';

export default function VoteCategoryPage({ params }: { params: { categorySlug: string } }) {
  return <VoteWizard categorySlug={params.categorySlug} />;
}
