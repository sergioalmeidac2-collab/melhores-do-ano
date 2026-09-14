'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  active: boolean;
  order: number;
  _count: { companies: number; votes: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', emoji: '🏆' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/categories', {
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
    setForm({ name: '', description: '', emoji: '🏆' });
    load();
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !cat.active }),
    });
    load();
  }

  async function remove(cat: Category) {
    if (!confirm(`Excluir/desativar a categoria "${cat.name}"?`)) return;
    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Categorias</h1>

      <form onSubmit={createCategory} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Nova categoria</h2>
        <div className="flex gap-3">
          <input
            className="input w-20 text-center text-xl"
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            maxLength={4}
          />
          <input
            className="input flex-1"
            placeholder="Nome da categoria (ex: Melhor Ótica)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <input
          className="input"
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Salvando...' : 'Adicionar categoria'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && <p className="text-ink-400">Carregando...</p>}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-ink-800/60 border border-ink-700 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">{cat.emoji}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{cat.name}</p>
                <p className="text-xs text-ink-500">
                  {cat._count.companies} empresas · {cat._count.votes} votos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  cat.active
                    ? 'border-green-500/40 text-green-400'
                    : 'border-ink-600 text-ink-400'
                }`}
              >
                {cat.active ? 'Ativa' : 'Inativa'}
              </button>
              <button onClick={() => remove(cat)} className="text-xs text-red-400 hover:underline">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {!loading && categories.length === 0 && (
          <p className="text-ink-500 text-sm">Nenhuma categoria cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
