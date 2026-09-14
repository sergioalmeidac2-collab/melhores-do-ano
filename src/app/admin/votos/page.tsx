'use client';

import { useEffect, useState } from 'react';
import { formatNormalizedPhone } from '@/lib/phone';

interface Vote {
  id: string;
  status: 'VALID' | 'SUSPICIOUS' | 'INVALID';
  createdAt: string;
  utmSource: string | null;
  category: { name: string };
  company: { name: string };
  participant: { name: string; phone: string; city: string | null; neighborhood: string | null };
  voteSource: { label: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminVotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    categoryId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    city: '',
    search: '',
  });

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    fetch(`/api/admin/votes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVotes(d.votes);
        setTotal(d.total);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories));
  }, []);

  useEffect(load, [filters]);

  async function setStatus(vote: Vote, status: Vote['status']) {
    await fetch(`/api/admin/votes/${vote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function blockPhone(vote: Vote) {
    if (!confirm(`Bloquear o telefone de "${vote.participant.name}" de votar novamente?`)) return;
    await fetch(`/api/admin/votes/${vote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockPhone: true, status: 'INVALID' }),
    });
    load();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    window.location.href = `/api/admin/export?${params}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold">Votos ({total})</h1>
        <button onClick={exportCsv} className="btn-primary">
          EXPORTAR RESULTADOS (CSV)
        </button>
      </div>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select
          className="input"
          value={filters.categoryId}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Todos status</option>
          <option value="VALID">Válido</option>
          <option value="SUSPICIOUS">Suspeito</option>
          <option value="INVALID">Invalidado</option>
        </select>

        <input
          type="date"
          className="input"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
        />
        <input
          type="date"
          className="input"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Cidade"
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Buscar nome/telefone"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-ink-800">
              <th className="py-2 px-3">Data</th>
              <th className="py-2 px-3">Categoria</th>
              <th className="py-2 px-3">Empresa</th>
              <th className="py-2 px-3">Participante</th>
              <th className="py-2 px-3">Telefone</th>
              <th className="py-2 px-3">Origem</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {votes.map((v) => (
              <tr key={v.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                <td className="py-2 px-3 whitespace-nowrap text-ink-400">
                  {new Date(v.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3">{v.category.name}</td>
                <td className="py-2 px-3">{v.company.name}</td>
                <td className="py-2 px-3">{v.participant.name}</td>
                <td className="py-2 px-3 text-ink-400">{formatNormalizedPhone(v.participant.phone)}</td>
                <td className="py-2 px-3 text-ink-400">{v.voteSource?.label ?? v.utmSource ?? 'Direto'}</td>
                <td className="py-2 px-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="py-2 px-3 space-x-2 whitespace-nowrap">
                  {v.status !== 'VALID' && (
                    <button onClick={() => setStatus(v, 'VALID')} className="text-green-400 text-xs hover:underline">
                      Validar
                    </button>
                  )}
                  {v.status !== 'INVALID' && (
                    <button onClick={() => setStatus(v, 'INVALID')} className="text-red-400 text-xs hover:underline">
                      Invalidar
                    </button>
                  )}
                  <button onClick={() => blockPhone(v)} className="text-ink-500 text-xs hover:underline">
                    Bloquear telefone
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="text-ink-400 mt-4">Carregando...</p>}
        {!loading && votes.length === 0 && <p className="text-ink-500 mt-4 text-sm">Nenhum voto encontrado.</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Vote['status'] }) {
  const map = {
    VALID: 'border-green-500/40 text-green-400',
    SUSPICIOUS: 'border-amber-500/40 text-amber-400',
    INVALID: 'border-red-500/40 text-red-400',
  } as const;
  const label = { VALID: 'Válido', SUSPICIOUS: 'Suspeito', INVALID: 'Invalidado' } as const;
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status]}`}>{label[status]}</span>;
}
