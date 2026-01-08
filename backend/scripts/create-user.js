import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = getArg('email');
  const password = getArg('password');
  const nombre = getArg('nombre') || 'Usuario';
  const roleName = getArg('role') || 'admin';

  if (!email) throw new Error('Falta --email');
  if (!password) throw new Error('Falta --password');

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Rol inexistente: ${roleName}. Roles válidos: admin, recepcion, profesional`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      nombre,
      passwordHash,
      roleId: role.id
    },
    create: {
      email,
      nombre,
      passwordHash,
      roleId: role.id
    }
  });

  console.log('Usuario listo:', { id: user.id, email: user.email, nombre: user.nombre, role: roleName });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e.message || e);
    await prisma.$disconnect();
    process.exit(1);
  });
