import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { ProgressBar } from '@/components/ProgressBar';
import { getCategoryImageUrl } from '@/lib/categoryImage';

export const dynamic = 'force-dynamic';

export default async function ChooseCategoryPage() {
  const settings = await prisma.eventSettings.findFirst();

  if (settings?.votingStatus === 'NOT_STARTED') {
    return <StatusMessage title="Em breve iniciaremos a votação." subtitle="Volte em breve para escolher seus favoritos." />;
  }
  if (settings?.votingStatus === 'CLOSED') {
    return <StatusMessage title="A votação foi encerrada." subtitle="Obrigado a todos que participaram do Melhores do Ano." />;
  }

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { companies: true } } },
  });
  const visible = categories.filter((c) => c._count.companies > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
      <ProgressBar step={1} totalSteps={4} />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-center mb-2">Escolha uma categoria</h1>
      <p className="text-ink-300 text-center mb-10">Selecione a categoria em que você quer votar.</p>

      {visible.length === 0 && (
        <p className="text-center text-ink-400">Nenhuma categoria disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((c) => (
          <Link
            key={c.id}
            href={`/votar/${c.slug}`}
            className="group relative overflow-hidden bg-ink-800/60 border border-ink-700 hover:border-gold-400 rounded-2xl transition-all hover:shadow-premium hover:-translate-y-0.5"
          >
            <div className="relative w-full h-32">
              <Image src={getCategoryImageUrl(c)} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />
              <span className="absolute top-3 left-3 text-2xl">{c.emoji}</span>
            </div>
            <div className="p-6">
              <p className="font-display font-bold text-xl group-hover:text-gold-300 transition-colors">
                {c.name}
              </p>
              {c.description && <p className="text-ink-400 text-sm mt-1">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusMessage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 gap-3">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="text-ink-300">{subtitle}</p>
      <Link href="/" className="text-gold-400 underline underline-offset-4 mt-4">
        Voltar para a página inicial
      </Link>
    </div>
  );
}
