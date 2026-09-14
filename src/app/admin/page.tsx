'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  totalVotes: number;
  totalParticipants: number;
  suspiciousCount: number;
  invalidCount: number;
  categoryStats: {
    categoryId: string;
    categoryName: string;
    totalVotes: number;
    ranking: { companyId: string; companyName: string; votes: number; percentage: number }[];
  }[];
  votesByDay: { day: string; count: number }[];
  votesByHour: { hour: string; count: number }[];
  votesBySource: { source: string; count: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-ink-400">Carregando...</p>;

  const maxDay = Math.max(1, ...data.votesByDay.map((d) => Number(d.count)));
  const maxHour = Math.max(1, ...data.votesByHour.map((d) => Number(d.count)));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de votos" value={data.totalVotes} />
        <StatCard label="Participantes" value={data.totalParticipants} />
        <StatCard label="Suspeitos" value={data.suspiciousCount} accent="text-amber-400" />
        <StatCard label="Invalidados" value={data.invalidCount} accent="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Evolução dos votos por dia">
          <div className="flex items-end gap-1.5 h-40">
            {data.votesByDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-gradient-to-t from-gold-600 to-gold-400 rounded-t-md min-h-[2px] transition-all"
                  style={{ height: `${(Number(d.count) / maxDay) * 100}%` }}
                  title={`${d.day}: ${d.count}`}
                />
              </div>
            ))}
            {data.votesByDay.length === 0 && <p className="text-ink-500 text-sm">Sem dados ainda.</p>}
          </div>
        </Card>

        <Card title="Horários com maior volume">
          <div className="flex items-end gap-1 h-40">
            {data.votesByHour.map((d) => (
              <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-ink-600 to-ink-400 rounded-t-md min-h-[2px]"
                  style={{ height: `${(Number(d.count) / maxHour) * 100}%` }}
                  title={`${d.hour}h: ${d.count}`}
                />
                <span className="text-[10px] text-ink-500">{d.hour}h</span>
              </div>
            ))}
            {data.votesByHour.length === 0 && <p className="text-ink-500 text-sm">Sem dados ainda.</p>}
          </div>
        </Card>
      </div>

      <Card title="Origem dos votos (UTM)">
        <div className="space-y-2">
          {data.votesBySource.map((s) => (
            <div key={s.source} className="flex items-center gap-3">
              <span className="text-sm text-ink-300 w-32 truncate">{s.source}</span>
              <div className="flex-1 bg-ink-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full"
                  style={{
                    width: `${(s.count / Math.max(1, ...data.votesBySource.map((x) => x.count))) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-ink-400 w-10 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="font-display text-xl font-bold mb-4">Ranking por categoria</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          {data.categoryStats.map((cat) => (
            <Card key={cat.categoryId} title={cat.categoryName}>
              <p className="text-ink-500 text-xs mb-3">{cat.totalVotes} votos válidos</p>
              <div className="space-y-3">
                {cat.ranking.map((r, idx) => (
                  <div key={r.companyId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink-100">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`} {r.companyName}
                      </span>
                      <span className="text-ink-400">{r.votes} ({r.percentage}%)</span>
                    </div>
                    <div className="bg-ink-800 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gold-400 rounded-full" style={{ width: `${r.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {cat.ranking.length === 0 && <p className="text-ink-500 text-sm">Sem votos ainda.</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5">
      <p className="text-ink-400 text-xs mb-1">{label}</p>
      <p className={`text-3xl font-bold font-display ${accent ?? 'text-ink-50'}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5">
      <h3 className="font-semibold text-ink-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}
