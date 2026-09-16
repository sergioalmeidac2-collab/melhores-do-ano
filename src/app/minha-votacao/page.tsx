'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { maskBrazilPhone } from '@/lib/phone';

interface CategoryProgress {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  status: 'VOTED' | 'SKIPPED' | 'PENDING';
}

interface Participant {
  name: string;
  phone: string;
  instagram: string | null;
  email: string | null;
}

const STORAGE_KEY = 'mda_participant';

type Screen = 'phone' | 'register' | 'checklist';

export default function MinhaVotacaoPage() {
  const [screen, setScreen] = useState<Screen>('phone');
  const [phone, setPhone] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    name: '',
    instagram: '',
    email: '',
    consentTerms: false,
    consentMarketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const saved = JSON.parse(stored) as Participant;
        setPhone(maskBrazilPhone(saved.phone.replace(/^55/, '')));
        lookupPhone(saved.phone, true);
      } catch {
        // ignora storage corrompido
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupPhone(rawPhone: string, silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/public/participant?phone=${encodeURIComponent(rawPhone)}`);
      const data = await res.json();
      if (!res.ok) {
        if (!silent) setError(data.error ?? 'Telefone inválido.');
        return;
      }
      setCategories(data.categories);
      if (data.participant) {
        setParticipant(data.participant);
        // já existe cadastro -> já aceitou os termos alguma vez antes, não precisa
        // pedir de novo a cada categoria votada nesta sessão
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data.participant, consentTerms: true }));
        setScreen('checklist');
      } else if (!silent) {
        setScreen('register');
      }
    } catch {
      if (!silent) setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Informe um telefone válido com DDD.');
      return;
    }
    lookupPhone(digits);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (registerForm.name.trim().length < 3) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!registerForm.consentTerms) {
      setError('É necessário aceitar os Termos de Participação.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch('/api/public/participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: registerForm.name.trim(),
        phone: phone.replace(/\D/g, ''),
        instagram: registerForm.instagram || null,
        email: registerForm.email || null,
        consentTerms: registerForm.consentTerms,
        consentMarketing: registerForm.consentMarketing,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Não foi possível criar seu cadastro.');
      return;
    }
    setParticipant(data.participant);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data.participant, consentTerms: true }));
    setScreen('checklist');
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setParticipant(null);
    setPhone('');
    setScreen('phone');
  }

  const votedCount = categories.filter((c) => c.status !== 'PENDING').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-center mb-2">Minha Votação</h1>
      <p className="text-ink-300 text-center mb-10">
        Acompanhe em quais categorias você já votou — sem ver resultados ou ranking.
      </p>

      {screen === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="max-w-sm mx-auto space-y-4">
          <label className="block">
            <span className="block text-sm text-ink-300 mb-1.5">Seu WhatsApp / Telefone</span>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(maskBrazilPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              maxLength={16}
              autoFocus
            />
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      )}

      {screen === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="max-w-sm mx-auto space-y-4">
          <p className="text-ink-300 text-sm text-center mb-2">
            Primeiro acesso com {phone} — vamos criar seu cadastro rapidinho.
          </p>
          <label className="block">
            <span className="block text-sm text-ink-300 mb-1.5">Nome completo *</span>
            <input
              className="input"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-300 mb-1.5">Instagram (opcional)</span>
            <input
              className="input"
              value={registerForm.instagram}
              onChange={(e) => setRegisterForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="@seuinstagram"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-300 mb-1.5">E-mail (opcional)</span>
            <input
              type="email"
              className="input"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-ink-300 pt-1">
            <input
              type="checkbox"
              checked={registerForm.consentTerms}
              onChange={(e) => setRegisterForm((f) => ({ ...f, consentTerms: e.target.checked }))}
              className="mt-1 accent-gold-500 w-4 h-4"
            />
            <span>
              Li e concordo com os{' '}
              <Link href="/termos" target="_blank" className="text-gold-400 underline underline-offset-2">
                Termos de Participação
              </Link>{' '}
              e a{' '}
              <Link href="/privacidade" target="_blank" className="text-gold-400 underline underline-offset-2">
                Política de Privacidade
              </Link>
              . *
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-ink-400">
            <input
              type="checkbox"
              checked={registerForm.consentMarketing}
              onChange={(e) => setRegisterForm((f) => ({ ...f, consentMarketing: e.target.checked }))}
              className="mt-1 accent-gold-500 w-4 h-4"
            />
            <span>Autorizo o contato para receber informações sobre o evento e novidades.</span>
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setScreen('phone')} className="btn-secondary">
              Voltar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar cadastro'}
            </button>
          </div>
        </form>
      )}

      {screen === 'checklist' && participant && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-ink-800/60 border border-ink-700 rounded-xl p-4">
            <div>
              <p className="font-medium">{participant.name}</p>
              <p className="text-xs text-ink-500">
                {votedCount} de {categories.length} categorias concluídas
              </p>
            </div>
            <button onClick={logout} className="text-xs text-ink-500 hover:text-ink-300">
              Trocar telefone
            </button>
          </div>

          <div className="bg-ink-900 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gold-400 rounded-full transition-all"
              style={{ width: `${categories.length > 0 ? (votedCount / categories.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/votar/${c.slug}`}
                className={`flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                  c.status === 'PENDING'
                    ? 'bg-ink-800/60 border-ink-700 hover:border-gold-400'
                    : 'bg-ink-900/40 border-ink-800'
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                {c.status === 'VOTED' && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/40 text-green-400">
                    Votou
                  </span>
                )}
                {c.status === 'SKIPPED' && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-ink-600 text-ink-400">
                    Pulou
                  </span>
                )}
                {c.status === 'PENDING' && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-gold-500/40 text-gold-300">
                    Pendente
                  </span>
                )}
              </Link>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-ink-400 text-sm">Nenhuma categoria disponível no momento.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
