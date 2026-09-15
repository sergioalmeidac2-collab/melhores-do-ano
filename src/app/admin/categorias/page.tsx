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

// Taxonomia real de categorias usada em concursos "Melhores do Ano" municipais
// (referência: melhoresdoano.vercel.app, edição Barretos-SP 2024). Serve como
// ponto de partida editável — nada aqui é criado automaticamente, o admin
// revisa e importa só o que quiser pelo botão abaixo.
const CATEGORY_SUGGESTIONS = [
  'Academia de Luta', 'Academia', 'Acessórios Automotivos', 'Acessórios para Celulares',
  'Adestrador(a) de Cães', 'Administradora de Condomínios', 'Algodão Doce', 'Aluguel de Brinquedos',
  'Assessoria Esportiva', 'Assistência Técnica em Celulares', 'Auto Elétrica', 'Auto Peças',
  'Banho e Tosa', 'Bar / Pub', 'Barbeiro(a)', 'Bartender', 'Body Piercing', 'Cabeleireiro(a)',
  'Cantor(a)', 'Carrinho de Pipoca', 'Casa de Assados', 'Cerimonialista', 'Chefe de Cozinha',
  'Churrasqueiro(a)', 'Clínica Especializada em Emagrecimento', 'Clínica Veterinária',
  'Condutor(a) Escolar', 'Consultoria de RH', 'Contador(a)', 'Corretor(a) de Seguros',
  'Decorador(a) de Festas e Eventos', 'Despachante', 'DJ', 'Escritório de Contabilidade',
  'Fotógrafo(a)', 'Funilaria e Pintura', 'Garçom / Garçonete', 'Hamburgueria',
  'Higienização de Estofados', 'Influenciador(a) Digital', 'Locutor(a)',
  'Loja de Canecas Personalizadas', 'Manicure e Pedicure', 'Montador(a) de Móveis',
  'Médico(a) Veterinário(a)', 'Papelaria Personalizada', 'Pastelaria', 'Pizzaria',
  'Profissional de Harmonização Facial', 'Página de Instagram/Facebook (Notícias)',
  'Segurança', 'Seguro Veicular',
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', emoji: '🏆' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState(CATEGORY_SUGGESTIONS.join('\n'));
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

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

  async function importBulk() {
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    setBulkSaving(true);
    setBulkResult(null);
    const res = await fetch('/api/admin/categories/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    setBulkSaving(false);
    if (!res.ok) {
      setBulkResult(data.error ?? 'Erro ao importar.');
      return;
    }
    setBulkResult(`${data.created} categoria(s) criada(s), ${data.skipped} já existiam e foram ignoradas.`);
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

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowBulkImport((s) => !s)}
          className="text-sm text-gold-400 hover:underline"
        >
          {showBulkImport ? 'Ocultar' : 'Importar várias categorias de uma vez'}
        </button>

        {showBulkImport && (
          <div className="space-y-3">
            <p className="text-ink-400 text-xs">
              Uma categoria por linha. Já vem preenchido com uma lista de referência de categorias reais usadas em
              concursos "Melhores do Ano" — edite à vontade antes de importar (remova o que não usar, adicione o
              que faltar). Categorias com o mesmo nome de uma já existente são ignoradas.
            </p>
            <textarea
              className="input min-h-[200px] font-mono text-xs"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {bulkResult && <p className="text-sm text-ink-300">{bulkResult}</p>}
            <button
              type="button"
              onClick={importBulk}
              disabled={bulkSaving}
              className="btn-secondary disabled:opacity-60"
            >
              {bulkSaving ? 'Importando...' : 'Importar lista'}
            </button>
          </div>
        )}
      </div>

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
