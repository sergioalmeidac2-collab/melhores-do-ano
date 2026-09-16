'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface Company {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  instagram: string | null;
  phone: string | null;
  active: boolean;
  approved: boolean;
  categories: { category: Category }[];
  _count: { votes: number };
}

const emptyForm = {
  name: '',
  description: '',
  logoUrl: '',
  instagram: '',
  phone: '',
  categoryIds: [] as string[],
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pendingCompanies = companies.filter((c) => !c.approved);
  const approvedCompanies = companies.filter((c) => c.approved);

  function load() {
    Promise.all([
      fetch('/api/admin/companies').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json()),
    ]).then(([c, cat]) => {
      setCompanies(c.companies);
      setCategories(cat.categories);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function startEdit(company: Company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      description: company.description ?? '',
      logoUrl: company.logoUrl ?? '',
      instagram: company.instagram ?? '',
      phone: company.phone ?? '',
      categoryIds: company.categories.map((c) => c.category.id),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.categoryIds.length === 0) {
      setError('Selecione ao menos uma categoria.');
      return;
    }
    setSaving(true);
    setError(null);

    const url = editingId ? `/api/admin/companies/${editingId}` : '/api/admin/companies';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    cancelEdit();
    load();
  }

  async function toggleActive(company: Company) {
    await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !company.active }),
    });
    load();
  }

  async function remove(company: Company) {
    if (!confirm(`Excluir/desativar a empresa "${company.name}"?`)) return;
    await fetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' });
    load();
  }

  async function approve(company: Company) {
    await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });
    load();
  }

  async function reject(company: Company) {
    if (!confirm(`Rejeitar e remover "${company.name}"? Isso também apaga o(s) voto(s) associados a ela.`)) return;
    await fetch(`/api/admin/companies/${company.id}/reject`, { method: 'POST' });
    load();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Empresas</h1>

      <form onSubmit={submit} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">{editingId ? 'Editar empresa' : 'Nova empresa'}</h2>

        <input
          className="input"
          placeholder="Nome da empresa"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          className="input"
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="URL do logo (opcional)"
            value={form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          />
          <input
            className="input"
            placeholder="@instagram (opcional)"
            value={form.instagram}
            onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
          />
        </div>
        <input
          className="input"
          placeholder="Telefone (opcional)"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />

        <div>
          <p className="text-sm text-ink-300 mb-2">Categorias que essa empresa participa *</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  form.categoryIds.includes(cat.id)
                    ? 'bg-gold-500/15 border-gold-400 text-gold-300'
                    : 'border-ink-700 text-ink-400'
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
            {categories.length === 0 && (
              <p className="text-ink-500 text-sm">Cadastre uma categoria primeiro.</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn-secondary">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar empresa'}
          </button>
        </div>
      </form>

      {pendingCompanies.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gold-300">
            Sugestões de votantes pendentes de aprovação ({pendingCompanies.length})
          </h2>
          <p className="text-ink-400 text-xs -mt-2">
            Nomes que alguém digitou na votação por não encontrar a empresa na lista. Aprove para que passem a
            valer nos resultados, ou rejeite para descartar (spam, duplicata, nome ofensivo etc).
          </p>
          {pendingCompanies.map((company) => (
            <div key={company.id} className="bg-gold-500/5 border border-gold-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{company.name}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {company.categories.map((c) => c.category.name).join(', ') || 'Sem categoria'} ·{' '}
                    {company._count.votes} voto(s)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => approve(company)} className="text-xs text-green-400 hover:underline">
                    Aprovar
                  </button>
                  <button onClick={() => reject(company)} className="text-xs text-red-400 hover:underline">
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-ink-400">Carregando...</p>}
        {approvedCompanies.map((company) => (
          <div key={company.id} className="bg-ink-800/60 border border-ink-700 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{company.name}</p>
                <p className="text-xs text-ink-500 truncate">
                  {company.categories.map((c) => c.category.name).join(', ') || 'Sem categoria'} ·{' '}
                  {company._count.votes} votos
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(company)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    company.active ? 'border-green-500/40 text-green-400' : 'border-ink-600 text-ink-400'
                  }`}
                >
                  {company.active ? 'Ativa' : 'Inativa'}
                </button>
                <button onClick={() => startEdit(company)} className="text-xs text-gold-400 hover:underline">
                  Editar
                </button>
                <button onClick={() => remove(company)} className="text-xs text-red-400 hover:underline">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && approvedCompanies.length === 0 && (
          <p className="text-ink-500 text-sm">Nenhuma empresa cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
