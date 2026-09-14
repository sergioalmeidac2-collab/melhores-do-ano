// Seed mínimo: cria SOMENTE a conta de administrador inicial e as
// configurações padrão do evento. Categorias e empresas reais devem ser
// cadastradas pelo próprio administrador através do painel (/admin).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@melhoresdoano.com';
  const password = process.env.ADMIN_PASSWORD ?? 'TrocarSenha123!';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.admin.create({
      data: { name: 'Administrador', email, passwordHash, role: 'admin' },
    });
    console.log(`Admin criado: ${email} / senha: ${password} (troque após o primeiro login)`);
  } else {
    console.log(`Admin já existe: ${email}`);
  }

  const settings = await prisma.eventSettings.findFirst();
  if (!settings) {
    await prisma.eventSettings.create({ data: {} });
    console.log('Configurações padrão do evento criadas.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
