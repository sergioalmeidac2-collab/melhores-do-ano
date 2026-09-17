import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminSession } from './auth';
import { prisma } from './prisma';

const CURRENT_CITY_COOKIE = 'mda_admin_city';

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }
  return { session, error: null };
}

// Para ações restritas ao dono da conta (gestão de cidades, configurações
// globais de uma cidade específica não entram aqui — só coisas que afetam a
// plataforma como um todo: criar cidades, gerenciar outros admins).
export async function requireSuperAdmin() {
  const { session, error } = await requireAdmin();
  if (error) return { session: null, error };
  if (session!.role !== 'admin' || session!.cityId !== null) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Apenas administradores da plataforma podem fazer isso.' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * Resolve a cidade "ativa" para esta requisição de admin:
 * - "editor" (admin de uma cidade): sempre a cidade dele, não tem escolha.
 * - "admin" (dono da plataforma): a cidade selecionada no seletor do painel
 *   (salva num cookie), com fallback pra primeira cidade cadastrada.
 * Todo endpoint de admin que lida com dado de uma cidade específica
 * (categorias, empresas, votos, configurações, origens) deve usar isto em
 * vez de aceitar cityId vindo do cliente sem checar — assim um editor nunca
 * consegue, nem por engano, ler ou escrever em outra cidade.
 */
export async function requireCityScope() {
  const { session, error } = await requireAdmin();
  if (error) return { session: null, cityId: null, error };

  if (session!.cityId) {
    return { session, cityId: session!.cityId, error: null };
  }

  const cookieCityId = cookies().get(CURRENT_CITY_COOKIE)?.value;
  if (cookieCityId) {
    const exists = await prisma.city.findUnique({ where: { id: cookieCityId } });
    if (exists) return { session, cityId: exists.id, error: null };
  }

  const firstCity = await prisma.city.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstCity) {
    return {
      session: null,
      cityId: null,
      error: NextResponse.json({ error: 'Nenhuma cidade cadastrada ainda.' }, { status: 400 }),
    };
  }
  return { session, cityId: firstCity.id, error: null };
}

export const CURRENT_CITY_COOKIE_NAME = CURRENT_CITY_COOKIE;
