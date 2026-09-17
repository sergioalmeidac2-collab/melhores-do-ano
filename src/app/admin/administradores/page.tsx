'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  cityId: string | null;
  city?: { name: string } | null;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  state: string;
}

export default function AdminAdministradoresPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string } | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as 'admin' | 'editor',
    cityId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/admins')
      .then((r) => {
        if (r.status === 403) {
          router.replace('/admin');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setAdmins(d.admins);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then(setMe);
    fetch('/api/admin/cities')
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/admins', {
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
    setForm({ name: '', email: '', password: '', role: 'editor', cityId: '' });
    load();
  }

  async function remove(admin: Admin) {
    if (!confirm(`Remover o acesso de "${admin.name}" (${admin.email})?`)) return;
    const res = await fetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' });
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
        <h1 className="font-display text-2xl font-bold">Administradores</h1>
        <p className="text-ink-400 text-sm mt-1">
          <strong className="text-ink-200">Admin</strong>: acesso total, inclusive configurações do evento e
          gestão de outros acessos. <strong className="text-ink-200">Editor</strong>: gerencia categorias,
          empresas, votos e origens, mas não mexe em configurações globais nem em outros acessos.
        </p>
      </div>

      <form onSubmit={submit} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Novo acesso</h2>
        <input
          className="input"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          type="email"
          className="input"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <input
          type="password"
          className="input"
          placeholder="Senha (mínimo 8 caracteres)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <select
          className="input"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'editor' }))}
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        {form.role === 'editor' && (
          <select
            className="input"
            value={form.cityId}
            onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
            required
          >
            <option value="" disabled>
              Selecione a cidade que este acesso vai administrar
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.state ? ` (${c.state})` : ''}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Criando...' : 'Criar acesso'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && <p className="text-ink-400">Carregando...</p>}
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="bg-ink-800/60 border border-ink-700 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">
                {admin.name} {me?.email === admin.email && <span className="text-ink-500">(você)</span>}
              </p>
              <p className="text-xs text-ink-500">{admin.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  admin.role === 'admin'
                    ? 'border-gold-500/40 text-gold-300'
                    : 'border-ink-600 text-ink-400'
                }`}
              >
                {admin.role === 'admin' ? 'Admin' : `Editor · ${admin.city?.name ?? '—'}`}
              </span>
              {me?.email !== admin.email && (
                <button onClick={() => remove(admin)} className="text-xs text-red-400 hover:underline">
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
