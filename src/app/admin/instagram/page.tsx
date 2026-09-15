'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface Summary {
  total: number;
  valid: number;
  extraText: number;
  multipleVote: number;
  multipleMention: number;
  noMention: number;
}

interface RankingRow {
  companyId: string;
  companyName: string;
  votes: number;
  percentage: number;
}

interface CommentRow {
  id: string;
  username: string;
  rawText: string;
  status: string;
  companyName: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  VALID: 'Válido',
  EXTRA_TEXT: 'Texto além do voto',
  MULTIPLE_VOTE: 'Voto múltiplo',
  MULTIPLE_MENTION: 'Múltiplas menções',
  NO_MENTION: 'Sem menção',
};

const STATUS_COLOR: Record<string, string> = {
  VALID: 'border-green-500/40 text-green-400',
  EXTRA_TEXT: 'border-gold-500/40 text-gold-300',
  MULTIPLE_VOTE: 'border-amber-500/40 text-amber-400',
  MULTIPLE_MENTION: 'border-amber-500/40 text-amber-400',
  NO_MENTION: 'border-red-500/40 text-red-400',
};

export default function AdminInstagramVotesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [rawComments, setRawComments] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories);
        if (d.categories[0]) setCategoryId(d.categories[0].id);
      });
  }, []);

  function loadResults(catId: string) {
    if (!catId) return;
    fetch(`/api/admin/instagram-votes?categoryId=${catId}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setRanking(d.ranking);
        setComments(d.comments);
      });
  }

  useEffect(() => {
    if (categoryId) loadResults(categoryId);
  }, [categoryId]);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    const res = await fetch('/api/admin/instagram-votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, rawComments }),
    });
    const data = await res.json();
    setAnalyzing(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setRawComments('');
    loadResults(categoryId);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Votação por comentários do Instagram</h1>
        <p className="text-ink-400 text-sm mt-1">
          Canal alternativo/manual: cole os comentários de um post da categoria e o sistema classifica os votos
          automaticamente, do mesmo jeito que concursos "Melhores do Ano" costumam rodar por lá — voto por menção
          (@empresa) nos comentários. Não há integração automática com a API do Instagram nesta versão; o admin
          exporta ou copia os comentários manualmente.
        </p>
      </div>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <label className="block">
          <span className="block text-sm text-ink-300 mb-1.5">Categoria</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={analyze} className="space-y-3">
          <label className="block">
            <span className="block text-sm text-ink-300 mb-1.5">
              Comentários (um por linha, formato "usuario: comentário")
            </span>
            <textarea
              className="input min-h-[160px] font-mono text-xs"
              placeholder={'joaosilva: meu voto é pra @oticavisaoclara\nmaria.oliveira: @oticabelavista arrasa!'}
              value={rawComments}
              onChange={(e) => setRawComments(e.target.value)}
            />
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-ink-500 text-xs">
            Analisar substitui os resultados anteriores desta categoria (permite colar em lotes conforme novos
            comentários chegam, colando a lista completa atualizada de novo).
          </p>
          <button type="submit" disabled={analyzing || !categoryId} className="btn-primary disabled:opacity-60">
            {analyzing ? 'Analisando...' : 'Analisar comentários'}
          </button>
        </form>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={summary.total} />
          <StatCard label="Válidos" value={summary.valid} accent="text-green-400" />
          <StatCard label="Texto além" value={summary.extraText} accent="text-gold-300" />
          <StatCard label="Voto múltiplo" value={summary.multipleVote} accent="text-amber-400" />
          <StatCard label="Múltiplas menções" value={summary.multipleMention} accent="text-amber-400" />
          <StatCard label="Sem menção" value={summary.noMention} accent="text-red-400" />
        </div>
      )}

      {ranking.length > 0 && (
        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5">
          <h3 className="font-semibold text-ink-100 mb-4">Ranking (votos válidos)</h3>
          <div className="space-y-3">
            {ranking.map((r, idx) => (
              <div key={r.companyId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-100">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`} {r.companyName}
                  </span>
                  <span className="text-ink-400">
                    {r.votes} ({r.percentage}%)
                  </span>
                </div>
                <div className="bg-ink-900 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gold-400 rounded-full" style={{ width: `${r.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-ink-500 border-b border-ink-800">
                <th className="py-2 px-3">Usuário</th>
                <th className="py-2 px-3">Comentário</th>
                <th className="py-2 px-3">Empresa</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className="border-b border-ink-900">
                  <td className="py-2 px-3 whitespace-nowrap">@{c.username}</td>
                  <td className="py-2 px-3 text-ink-400 max-w-xs truncate">{c.rawText}</td>
                  <td className="py-2 px-3">{c.companyName ?? '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
      <p className="text-ink-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold font-display ${accent ?? 'text-ink-50'}`}>{value}</p>
    </div>
  );
}
