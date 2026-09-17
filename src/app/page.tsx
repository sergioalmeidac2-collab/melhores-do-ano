import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCategoryImageUrl } from '@/lib/categoryImage';
import { resolvePublicCityId } from '@/lib/publicCity';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cityId = await resolvePublicCityId();
  const city = cityId ? await prisma.city.findUnique({ where: { id: cityId } }) : null;
  let settings = cityId ? await prisma.eventSettings.findUnique({ where: { cityId } }) : null;
  if (!settings && cityId) settings = await prisma.eventSettings.create({ data: { cityId } });

  const categories = settings
    ? await prisma.category.findMany({
        where: { active: true, cityId: settings.cityId },
        orderBy: { order: 'asc' },
        include: { _count: { select: { companies: true } } },
      })
    : [];
  const visible = categories.filter((c) => c._count.companies > 0);

  if (!settings) {
    return (
      <main className="min-h-[92vh] flex items-center justify-center text-center px-4">
        <p className="text-ink-400">Nenhum evento configurado ainda.</p>
      </main>
    );
  }

  const statusLabel =
    settings.votingStatus === 'NOT_STARTED'
      ? 'Em breve'
      : settings.votingStatus === 'CLOSED'
        ? 'Votação encerrada'
        : 'Votação aberta';

  return (
    <main className="uppercase">
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
        {city?.name && (
          <p className="text-gold-300 font-medium tracking-wide mt-3 text-lg">
            {city.name}
            {city.state ? ` — ${city.state}` : ''}
          </p>
        )}
        <p className="text-ink-300 text-lg sm:text-xl max-w-xl mt-6">{settings.heroSubtitle}</p>

        <Link
          href="/votar"
          className="btn-primary mt-10 px-10 py-4 text-lg pulse-ring"
        >
          VOTAR AGORA
        </Link>

        <div className="flex flex-col items-center gap-3 mt-16">
          <a href="#categorias" className="text-ink-400 text-sm underline underline-offset-4">
            Ver categorias
          </a>
          <Link href="/minha-votacao" className="text-ink-500 text-sm underline underline-offset-4">
            Já comecei a votar — ver meu progresso
          </Link>
        </div>
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
                className="group relative overflow-hidden bg-ink-800/60 border border-ink-700 hover:border-gold-400 rounded-2xl transition-all hover:shadow-premium hover:-translate-y-0.5"
              >
                <div className="relative w-full h-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getCategoryImageUrl(c)} alt="" className="w-full h-full object-cover" />
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
