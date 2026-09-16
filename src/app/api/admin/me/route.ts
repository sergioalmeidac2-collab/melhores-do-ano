import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({ email: session!.email, role: session!.role });
}
