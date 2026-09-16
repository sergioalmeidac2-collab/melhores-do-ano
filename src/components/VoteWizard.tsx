'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProgressBar } from './ProgressBar';
import { maskBrazilPhone } from '@/lib/phone';

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  instagram: string | null;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string;
}

type Step = 'loading' | 'choose-company' | 'identify' | 'confirm' | 'success' | 'error';

const PARTICIPANT_STORAGE_KEY = 'mda_participant';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'mda_session_id';
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

function getKnownParticipant(): { name: string; phone: string; instagram: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function VoteWizard({ categorySlug }: { categorySlug: string }) {
  const [step, setStep] = useState<Step>('loading');
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formRenderedAt, setFormRenderedAt] = useState<number>(0);
  const [skipMode, setSkipMode] = useState(false);
  const [isKnownParticipant, setIsKnownParticipant] = useState(false);

  const [form, setForm] = useState(() => {
    const known = getKnownParticipant();
    return {
      name: known?.name ?? '',
      phone: known ? maskBrazilPhone(known.phone.replace(/^55/, '')) : '',
      instagram: known?.instagram ?? '',
      email: '',
      city: '',
      neighborhood: '',
      howFoundOut: '',
      consentTerms: false,
      consentMarketing: false,
      website: '', // honeypot
    };
  });

  useEffect(() => {
    setIsKnownParticipant(!!getKnownParticipant());
  }, []);

  const utm = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmContent: params.get('utm_content'),
      utmTerm: params.get('utm_term'),
      sourceSlug: params.get('src'),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/categories/${categorySlug}/companies`)
      .then((r) => {
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCategory(data.category);
        setCompanies(data.companies);
        setStep('choose-company');
      })
      .catch(() => {
        if (!cancelled) setStep('error');
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  function chooseCompany(company: Company) {
    setSelectedCompany(company);
    setSkipMode(false);
    setFormRenderedAt(Date.now());
    setStep('identify');
  }

  function skipCategory() {
    setSelectedCompany(null);
    setSkipMode(true);
    setFormRenderedAt(Date.now());
    setStep('identify');
  }

  function handleIdentifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 3) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }
    if (maskBrazilPhone(form.phone).replace(/\D/g, '').length < 10) {
      setErrorMessage('Informe um telefone válido com DDD.');
      return;
    }
    if (!form.consentTerms) {
      setErrorMessage('É necessário aceitar os Termos de Participação.');
      return;
    }
    setErrorMessage(null);
    if (skipMode) {
      submitVote(true);
    } else {
      setStep('confirm');
    }
  }

  async function submitVote(skip: boolean) {
    if (!category) return;
    if (!skip && !selectedCompany) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/public/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: category.slug,
          companySlug: selectedCompany?.slug,
          skip,
          name: form.name.trim(),
          phone: form.phone,
          instagram: form.instagram || null,
          email: form.email || null,
          city: form.city || null,
          neighborhood: form.neighborhood || null,
          howFoundOut: form.howFoundOut || null,
          consentTerms: form.consentTerms,
          consentMarketing: form.consentMarketing,
          website: form.website,
          formRenderedAt,
          sessionId: getOrCreateSessionId(),
          ...utm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? 'Não foi possível registrar.');
        setSubmitting(false);
        return;
      }

      const phoneDigits = form.phone.replace(/\D/g, '');
      localStorage.setItem(
        PARTICIPANT_STORAGE_KEY,
        JSON.stringify({ name: form.name.trim(), phone: `55${phoneDigits}`, instagram: form.instagram || null }),
      );
      setIsKnownParticipant(true);

      setStep('success');
    } catch {
      setErrorMessage('Falha de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-ink-300">
        Carregando categoria...
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 px-6">
        <p className="text-ink-200 text-lg">Categoria não encontrada ou indisponível.</p>
        <Link href="/votar" className="text-gold-400 underline underline-offset-4">
          Ver todas as categorias
        </Link>
      </div>
    );
  }

  const totalSteps = 4;
  const stepNumber = step === 'choose-company' ? 2 : step === 'identify' ? 3 : step === 'confirm' ? 4 : 4;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      {step !== 'success' && <ProgressBar step={stepNumber} totalSteps={totalSteps} />}

      {step === 'choose-company' && category && (
        <div className="animate-fade-in-up">
          {category.imageUrl && (
            <div className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden mb-6">
              <Image src={category.imageUrl} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />
            </div>
          )}
          <p className="text-gold-400 text-sm tracking-[0.2em] uppercase text-center mb-2">
            {category.emoji} {category.name}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-center mb-3">
            Escolha o seu favorito
          </h1>
          <p className="text-ink-300 text-center mb-10">
            Selecione a empresa que você quer indicar nesta categoria.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => chooseCompany(c)}
                className="group text-left bg-ink-800/60 border border-ink-700 hover:border-gold-400 rounded-2xl p-5 transition-all hover:shadow-premium hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  {c.logoUrl ? (
                    <Image
                      src={c.logoUrl}
                      alt={c.name}
                      width={56}
                      height={56}
                      className="rounded-xl object-cover w-14 h-14 bg-ink-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-ink-700 flex items-center justify-center text-xl font-display font-bold text-gold-300">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-50 group-hover:text-gold-300 transition-colors truncate">
                      {c.name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-ink-400 line-clamp-2 mt-0.5">{c.description}</p>
                    )}
                    {c.instagram && <p className="text-xs text-gold-500 mt-1">{c.instagram}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {companies.length === 0 && (
            <p className="text-center text-ink-400">Nenhuma empresa cadastrada nesta categoria ainda.</p>
          )}

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={skipCategory}
              className="text-ink-500 hover:text-ink-300 text-sm underline underline-offset-4"
            >
              Pular esta categoria
            </button>
          </div>
        </div>
      )}

      {step === 'identify' && category && (skipMode || selectedCompany) && (
        <form onSubmit={handleIdentifySubmit} className="animate-fade-in-up space-y-5">
          <h1 className="font-display text-3xl font-bold text-center mb-1">Identifique-se</h1>
          <p className="text-ink-300 text-center mb-8">
            {skipMode ? (
              <>Confirme seus dados para pular esta categoria.</>
            ) : (
              <>
                Seu voto em <span className="text-gold-300 font-medium">{selectedCompany?.name}</span> quase
                concluído.
              </>
            )}
          </p>

          {/* honeypot - invisível para humanos */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <Field label="Nome completo *">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
              maxLength={120}
              required
            />
          </Field>

          <Field label="WhatsApp / Telefone *">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: maskBrazilPhone(e.target.value) }))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              maxLength={16}
              required
            />
          </Field>

          <Field label="Instagram (opcional)">
            <input
              className="input"
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="@seuinstagram"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cidade (opcional)">
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </Field>
            <Field label="Bairro (opcional)">
              <input
                className="input"
                value={form.neighborhood}
                onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="E-mail (opcional)">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>

          <Field label="Como conheceu o Melhores do Ano? (opcional)">
            <input
              className="input"
              value={form.howFoundOut}
              onChange={(e) => setForm((f) => ({ ...f, howFoundOut: e.target.value }))}
              placeholder="Instagram, WhatsApp, indicação..."
            />
          </Field>

          <label className="flex items-start gap-3 text-sm text-ink-300 pt-2">
            <input
              type="checkbox"
              checked={form.consentTerms}
              onChange={(e) => setForm((f) => ({ ...f, consentTerms: e.target.checked }))}
              className="mt-1 accent-gold-500 w-4 h-4"
              required
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
              checked={form.consentMarketing}
              onChange={(e) => setForm((f) => ({ ...f, consentMarketing: e.target.checked }))}
              className="mt-1 accent-gold-500 w-4 h-4"
            />
            <span>Autorizo o contato para receber informações sobre o evento e novidades.</span>
          </label>

          {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('choose-company')}
              className="btn-secondary"
            >
              Voltar
            </button>
            <button type="submit" className="btn-primary flex-1">
              {skipMode ? 'Pular categoria' : 'Continuar'}
            </button>
          </div>
        </form>
      )}

      {step === 'confirm' && category && selectedCompany && (
        <div className="animate-fade-in-up space-y-6">
          <h1 className="font-display text-3xl font-bold text-center mb-1">Confirme seu voto</h1>
          <p className="text-ink-300 text-center mb-6">Revise as informações antes de confirmar.</p>

          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-6 space-y-4">
            <SummaryRow label="Categoria" value={`${category.emoji} ${category.name}`} />
            <SummaryRow label="Escolha" value={selectedCompany.name} />
            <SummaryRow label="Nome" value={form.name} />
            <SummaryRow label="WhatsApp" value={form.phone} />
            {form.instagram && <SummaryRow label="Instagram" value={form.instagram} />}
          </div>

          {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('identify')} className="btn-secondary">
              Voltar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitVote(false)}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'CONFIRMAR MEU VOTO'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && category && (skipMode || selectedCompany) && (
        <div className="animate-fade-in-up flex flex-col items-center text-center gap-5 py-10">
          <div className="w-20 h-20 rounded-full bg-gold-500/10 border-2 border-gold-400 flex items-center justify-center text-4xl pulse-ring">
            {skipMode ? '⏭️' : '🏆'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            {skipMode ? 'Categoria pulada!' : 'Voto registrado com sucesso!'}
          </h1>
          <p className="text-ink-300 max-w-md">
            {skipMode ? (
              <>
                Tudo bem, você pode votar nessa categoria depois. Categoria{' '}
                <span className="text-gold-300 font-medium">{category.name}</span> marcada como pulada.
              </>
            ) : (
              <>
                Obrigado por participar do Melhores do Ano. Seu voto em{' '}
                <span className="text-gold-300 font-medium">{selectedCompany?.name}</span> na categoria{' '}
                <span className="text-gold-300 font-medium">{category.name}</span> foi confirmado.
              </>
            )}
          </p>
          <div className="flex gap-3 mt-4">
            {isKnownParticipant && (
              <Link href="/minha-votacao" className="btn-secondary">
                Ver minha lista
              </Link>
            )}
            <Link href="/votar" className="btn-primary">
              Votar em outra categoria
            </Link>
          </div>
        </div>
      )}
    </div>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-ink-700 pb-3 last:border-0 last:pb-0">
      <span className="text-ink-400 text-sm">{label}</span>
      <span className="text-ink-50 font-medium text-right">{value}</span>
    </div>
  );
}
