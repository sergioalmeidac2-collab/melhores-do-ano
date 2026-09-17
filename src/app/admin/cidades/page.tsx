'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  active: boolean;
  createdAt: string;
  _count: { categories: number; votes: number };
}

export default function AdminCidadesPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', state: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/cities')
      .then((r) => {
        if (r.status === 403) {
          router.replace('/admin');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setCities(d.cities);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setForm({ name: '', state: '' });
    load();
  }

  async function toggleActive(city: City) {
    await fetch(`/api/admin/cities/${city.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !city.active }),
    });
    load();
  }

  async function remove(city: City) {
    if (
      !confirm(
        `Apagar a cidade "${city.name}"? Isso remove TODAS as categorias, empresas e votos dela. Essa ação não pode ser desfeita.`,
      )
    )
      return;
    const res = await fetch(`/api/admin/cities/${city.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    load();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Cidades</h1>
        <p className="text-ink-400 text-sm mt-1">
          Cada cidade é uma votação independente: categorias, empresas e votos próprios. Use o seletor no menu
          para trocar qual cidade você está gerenciando.
        </p>
      </div>

      <form onSubmit={submit} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Nova cidade</h2>
        <div className="grid grid-cols-3 gap-3">
          <input
            className="input col-span-2"
            placeholder="Nome da cidade"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="UF"
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Criando...' : 'Criar cidade'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && <p className="text-ink-400">Carregando...</p>}
        {cities.map((city) => (
          <div
            key={city.id}
            className="bg-ink-800/60 border border-ink-700 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">
                {city.name}
                {city.state ? ` — ${city.state}` : ''}
                {!city.active && <span className="text-ink-500"> (inativa)</span>}
              </p>
              <p className="text-xs text-ink-500">
                {city._count.categories} categorias · {city._count.votes} votos
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => toggleActive(city)} className="text-xs text-ink-400 hover:underline">
                {city.active ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => remove(city)} className="text-xs text-red-400 hover:underline">
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
