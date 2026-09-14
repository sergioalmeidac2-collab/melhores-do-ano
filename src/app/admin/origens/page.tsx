'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  label: string;
  slug: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  _count: { votes: number };
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [siteUrl, setSiteUrl] = useState('');
  const [form, setForm] = useState({ label: '', utmSource: '', utmMedium: '', utmCampaign: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/sources')
      .then((r) => r.json())
      .then((d) => setSources(d.sources));
  }

  useEffect(() => {
    load();
    setSiteUrl(window.location.origin);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm({ label: '', utmSource: '', utmMedium: '', utmCampaign: '' });
    load();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Origens / QR Code</h1>
      <p className="text-ink-400 text-sm">
        Crie uma origem para cada canal de divulgação (ex: totem no evento, bio do Instagram, parceiro X). Cada
        origem gera um link e um QR Code únicos, permitindo saber de onde vieram os votos.
      </p>

      <form onSubmit={submit} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <input
          className="input"
          placeholder="Nome da origem (ex: QR Code Totem Evento)"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          required
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="utm_source (ex: instagram)"
            value={form.utmSource}
            onChange={(e) => setForm((f) => ({ ...f, utmSource: e.target.value }))}
          />
          <input
            className="input"
            placeholder="utm_medium (ex: qrcode)"
            value={form.utmMedium}
            onChange={(e) => setForm((f) => ({ ...f, utmMedium: e.target.value }))}
          />
          <input
            className="input"
            placeholder="utm_campaign (ex: lancamento)"
            value={form.utmCampaign}
            onChange={(e) => setForm((f) => ({ ...f, utmCampaign: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          Criar origem
        </button>
      </form>

      <div className="space-y-4">
        {sources.map((s) => {
          const url = new URL(`${siteUrl}/votar`);
          url.searchParams.set('src', s.slug);
          if (s.utmSource) url.searchParams.set('utm_source', s.utmSource);
          if (s.utmMedium) url.searchParams.set('utm_medium', s.utmMedium);
          if (s.utmCampaign) url.searchParams.set('utm_campaign', s.utmCampaign);
          const finalUrl = url.toString();
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(finalUrl)}`;

          return (
            <div key={s.id} className="bg-ink-800/60 border border-ink-700 rounded-xl p-4 flex gap-4 items-center flex-wrap">
              {siteUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt={`QR Code ${s.label}`} className="w-24 h-24 rounded-lg bg-white p-1" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-ink-500">{s._count.votes} votos</p>
                <input
                  readOnly
                  value={finalUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="input mt-2 text-xs"
                />
              </div>
            </div>
          );
        })}
        {sources.length === 0 && <p className="text-ink-500 text-sm">Nenhuma origem cadastrada ainda.</p>}
      </div>
    </div>
  );
}
