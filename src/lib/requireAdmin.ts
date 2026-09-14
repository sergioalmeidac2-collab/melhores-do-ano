import { NextResponse } from 'next/server';
import { getAdminSession } from './auth';

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }
  return { session, error: null };
}
