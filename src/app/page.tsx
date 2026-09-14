import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let settings = await prisma.eventSettings.findFirst();
  if (!settings) settings = await prisma.eventSettings.create({ data: {} });

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { companies: true } } },
  });
  const visible = categories.filter((c) => c._count.companies > 0);

  const statusLabel =
    settings.votingStatus === 'NOT_STARTED'
      ? 'Em breve'
      : settings.votingStatus === 'CLOSED'
        ? 'Votação encerrada'
        : 'Votação aberta';

  return (
    <main>
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col items-center justify-center text-center px-4">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(229,167,43,0.18), transparent 55%), linear-gradient(180deg, #0f1219 0%, #080a0e 100%)',
          }}
        />
        <span className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-gold-400 border border-gold-500/40 rounded-full px-4 py-1.5 mb-8">
          {statusLabel} · {settings.eventYear}
        </span>
        <h1 className="font-display font-extrabold text-5xl sm:text-7xl leading-[1.05] tracking-tight max-w-4xl">
          {settings.heroTitle}
        </h1>
        {settings.city && (
          <p className="text-gold-300 font-medium tracking-wide mt-3 text-lg">{settings.city}</p>
        )}
        <p className="text-ink-300 text-lg sm:text-xl max-w-xl mt-6">{settings.heroSubtitle}</p>

        <Link
          href="/votar"
          className="btn-primary mt-10 px-10 py-4 text-lg pulse-ring"
        >
          VOTAR AGORA
        </Link>

        <a href="#categorias" className="text-ink-400 text-sm mt-16 underline underline-offset-4">
          Ver categorias
        </a>
      </section>

      <section id="categorias" className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-3">Categorias</h2>
        <p className="text-ink-300 text-center mb-12">Toque em uma categoria para votar.</p>

        {visible.length === 0 ? (
          <p className="text-center text-ink-400">Nenhuma categoria disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((c) => (
              <Link
                key={c.id}
                href={`/votar/${c.slug}`}
                className="group bg-ink-800/60 border border-ink-700 hover:border-gold-400 rounded-2xl p-6 transition-all hover:shadow-premium hover:-translate-y-0.5"
              >
                <span className="text-3xl">{c.emoji}</span>
                <p className="font-display font-bold text-xl mt-3 group-hover:text-gold-300 transition-colors">
                  {c.name}
                </p>
                {c.description && <p className="text-ink-400 text-sm mt-1">{c.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-ink-800 py-8 text-center text-ink-500 text-sm space-x-4">
        <Link href="/privacidade" className="hover:text-ink-300">Política de Privacidade</Link>
        <span>·</span>
        <Link href="/termos" className="hover:text-ink-300">Termos de Participação</Link>
      </footer>
    </main>
  );
}
