import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCityScope } from '@/lib/requireAdmin';

// Rejeita uma empresa sugerida por um votante ("escreva sua opção"): remove
// o voto associado, o vínculo com a categoria e a própria empresa. Diferente
// do DELETE genérico (que preserva histórico de empresas já consolidadas
// desativando em vez de apagar), aqui a intenção é realmente descartar uma
// sugestão indevida — spam, duplicata ou nome ofensivo.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { cityId, error } = await requireCityScope();
  if (error) return error;

  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company || company.cityId !== cityId) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  }

  await prisma.vote.deleteMany({ where: { companyId: company.id } });
  await prisma.categoryCompany.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });

  return NextResponse.json({ success: true });
}
