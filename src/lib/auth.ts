import { cookies } from 'next/headers';

// Usamos Web Crypto (globalThis.crypto.subtle) em vez do módulo `crypto` do Node
// porque este arquivo é importado pelo middleware, que roda em Edge runtime.

const COOKIE_NAME = 'mda_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET não configurado.');
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await importKey(getSecret());
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toBase64Url(signature);
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: string;
  exp: number;
}

export async function createSessionToken(payload: Omit<AdminSessionPayload, 'exp'>): Promise<string> {
  const full: AdminSessionPayload = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const body = btoa(JSON.stringify(full)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signature = await sign(body);
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = await sign(body);
  if (expected.length !== signature.length || expected !== signature) return null;

  try {
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as AdminSessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_TTL_MS = SESSION_TTL_MS;
