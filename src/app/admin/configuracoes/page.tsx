'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  id: string;
  eventName: string;
  eventYear: number;
  city: string;
  heroTitle: string;
  heroSubtitle: string;
  votesPerCategory: number;
  votingStatus: 'NOT_STARTED' | 'OPEN' | 'CLOSED';
  rulesText: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.role !== 'admin') router.replace('/admin');
      });
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <p className="text-ink-400">Carregando...</p>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Configurações do Melhores do Ano</h1>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Evento</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do evento">
            <input
              className="input"
              value={settings.eventName}
              onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
            />
          </Field>
          <Field label="Ano">
            <input
              type="number"
              className="input"
              value={settings.eventYear}
              onChange={(e) => setSettings({ ...settings, eventYear: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Cidade">
          <input
            className="input"
            value={settings.city}
            onChange={(e) => setSettings({ ...settings, city: e.target.value })}
          />
        </Field>
      </div>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Textos da página inicial</h2>
        <Field label="Título principal">
          <input
            className="input"
            value={settings.heroTitle}
            onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
          />
        </Field>
        <Field label="Texto secundário">
          <input
            className="input"
            value={settings.heroSubtitle}
            onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
          />
        </Field>
      </div>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Regras de votação</h2>
        <Field label="Votos permitidos por categoria (por participante)">
          <input
            type="number"
            min={1}
            className="input"
            value={settings.votesPerCategory}
            onChange={(e) => setSettings({ ...settings, votesPerCategory: Number(e.target.value) })}
          />
        </Field>
        <Field label="Status da votação">
          <select
            className="input"
            value={settings.votingStatus}
            onChange={(e) => setSettings({ ...settings, votingStatus: e.target.value as Settings['votingStatus'] })}
          >
            <option value="NOT_STARTED">Não iniciada</option>
            <option value="OPEN">Aberta</option>
            <option value="CLOSED">Encerrada</option>
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {saved && <span className="text-green-400 text-sm">Salvo!</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
