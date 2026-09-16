import { NextResponse } from 'next/server';
import { getAdminSession } from './auth';

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }
  return { session, error: null };
}

// Para ações restritas ao dono da conta (configurações do evento, gestão de
// outros admins) — o papel "editor" cobre o dia a dia (categorias, empresas,
// votos, origens) mas não deve poder mudar configurações globais nem criar
// outros acessos.
export async function requireSuperAdmin() {
  const { session, error } = await requireAdmin();
  if (error) return { session: null, error };
  if (session!.role !== 'admin') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Apenas administradores podem fazer isso.' }, { status: 403 }),
    };
  }
  return { session, error: null };
}
