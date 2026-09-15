'use client';

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

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <nav className="sm:w-60 shrink-0 bg-ink-900 border-b sm:border-b-0 sm:border-r border-ink-800 p-4 sm:p-6 flex sm:flex-col gap-1 overflow-x-auto">
      <p className="font-display font-bold text-lg mb-2 hidden sm:block px-2">Melhores do Ano</p>
      {links.map((link) => {
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
