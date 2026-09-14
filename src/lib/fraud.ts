import { createHash } from 'crypto';
import { prisma } from './prisma';

/** Hash de IP (não guardamos o IP em texto puro, só um hash com salt do secret). */
export function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? 'fallback-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? '0.0.0.0';
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const WINDOW_MS = 60_000; // 1 minuto
const MAX_VOTES_PER_WINDOW = 5; // por IP, proteção contra bots — não bloqueia pessoas, só rajadas

/**
 * Rate limit simples baseado em contagem de votos recentes por IP (tabela Vote já guarda ipHash).
 * Não usamos IP isoloadamente para invalidar votos — apenas para desacelerar rajadas automatizadas.
 */
export async function checkRateLimit(ipHash: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recentCount = await prisma.vote.count({
    where: { ipHash, createdAt: { gte: since } },
  });

  if (recentCount >= MAX_VOTES_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: 60 };
  }
  return { allowed: true };
}

export async function isPhoneBlocked(normalizedPhone: string): Promise<boolean> {
  const blocked = await prisma.blockedPhone.findUnique({ where: { phone: normalizedPhone } });
  return !!blocked;
}

export async function isSessionBlocked(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const blocked = await prisma.blockedSession.findUnique({ where: { sessionId } });
  return !!blocked;
}
