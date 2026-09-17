'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/empresas', label: 'Empresas' },
  { href: '/admin/votos', label: 'Votos' },
  { href: '/admin/instagram', label: 'Votos via Instagram' },
  { href: '/admin/origens', label: 'Origens / QR Code' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

// Só o papel "admin" (dono da plataforma, cityId nulo) vê e acessa isso —
// "editor" (admin de uma cidade) cuida do dia a dia da própria cidade mas não
// gerencia outras cidades nem outros acessos.
const superAdminLinks = [
  { href: '/admin/cidades', label: 'Cidades' },
  { href: '/admin/administradores', label: 'Administradores' },
];

interface City {
  id: string;
  name: string;
  state: string;
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const isSuperAdmin = role === 'admin' && cityId === null;

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        setRole(d.role ?? null);
        setCityId(d.cityId ?? null);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (role !== 'admin' || cityId !== null) return;
    fetch('/api/admin/cities')
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
  }, [role, cityId]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  async function switchCity(id: string) {
    await fetch('/api/admin/current-city', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityId: id }),
    });
    router.refresh();
    window.location.reload();
  }

  const currentCookieCityId =
    typeof document !== 'undefined'
      ? document.cookie.match(/mda_admin_city=([^;]+)/)?.[1]
      : undefined;

  const visibleLinks = isSuperAdmin ? [...links, ...superAdminLinks] : links;

  return (
    <nav className="sm:w-60 shrink-0 bg-ink-900 border-b sm:border-b-0 sm:border-r border-ink-800 p-4 sm:p-6 flex sm:flex-col gap-1 overflow-x-auto">
      <p className="font-display font-bold text-lg mb-2 hidden sm:block px-2">Melhores do Ano</p>

      {isSuperAdmin ? (
        cities.length > 0 && (
          <select
            className="input mb-3 text-sm"
            value={currentCookieCityId ?? cities[0]?.id ?? ''}
            onChange={(e) => switchCity(e.target.value)}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.state ? ` (${c.state})` : ''}
              </option>
            ))}
          </select>
        )
      ) : role === 'editor' || (role === 'admin' && cityId) ? (
        <p className="text-xs text-ink-500 mb-3 px-2">Gerenciando sua cidade</p>
      ) : null}

      {visibleLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              active ? 'bg-gold-500/15 text-gold-300 font-medium' : 'text-ink-300 hover:bg-ink-800'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="px-3 py-2 rounded-lg text-sm text-ink-400 hover:bg-ink-800 sm:mt-auto text-left"
      >
        Sair
      </button>
    </nav>
  );
}
