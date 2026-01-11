import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = ['admin', 'recepcion', 'profesional'];

  const roleRows = {};
  for (const name of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    roleRows[name] = role;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@centro.com';
  const adminNombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      nombre: adminNombre,
      passwordHash,
      roleId: roleRows.admin.id
    },
    create: {
      email: adminEmail,
      nombre: adminNombre,
      passwordHash,
      roleId: roleRows.admin.id
    }
  });

  const especialidades = [
    { nombre: 'Kinesiología', duracionTurnoMin: 30, activa: true },
    { nombre: 'Gimnasio', duracionTurnoMin: 30, activa: true }
  ];

  for (const e of especialidades) {
    await prisma.especialidad.upsert({
      where: { nombre: e.nombre },
      update: {
        duracionTurnoMin: e.duracionTurnoMin,
        activa: e.activa
      },
      create: e
    });
  }

  const obrasSociales = [
    { nombre: 'OSDE', plan: '210' },
    { nombre: 'OSDE', plan: '310' },
    { nombre: 'OSDE', plan: '410' },
    { nombre: 'Swiss Medical', plan: 'SMG20' },
    { nombre: 'Swiss Medical', plan: 'SMG30' },
    { nombre: 'Swiss Medical', plan: 'SMG40' },
    { nombre: 'Galeno', plan: '220' },
    { nombre: 'Galeno', plan: '330' },
    { nombre: 'Galeno', plan: '440' },
    { nombre: 'Medicus', plan: 'Azul' },
    { nombre: 'Medicus', plan: 'Celeste' },
    { nombre: 'Medicus', plan: 'Plata' },
    { nombre: 'Medicus', plan: 'Oro' },
    { nombre: 'Sancor Salud', plan: '1000' },
    { nombre: 'Sancor Salud', plan: '2000' },
    { nombre: 'Sancor Salud', plan: '3000' },
    { nombre: 'Sancor Salud', plan: '4000' },
    { nombre: 'OMINT', plan: 'Classic' },
    { nombre: 'OMINT', plan: 'Premium' },
    { nombre: 'Accord Salud', plan: '210' },
    { nombre: 'Accord Salud', plan: '310' },
    { nombre: 'Accord Salud', plan: '410' },
    { nombre: 'OSECAC', plan: 'General' },
    { nombre: 'PAMI', plan: 'General' },
    { nombre: 'IOMA', plan: 'General' },
    { nombre: 'OSPE', plan: 'General' },
    { nombre: 'OSDEPYM', plan: 'General' },
    { nombre: 'OSPECON', plan: 'General' },
    { nombre: 'OSPRERA', plan: 'General' },
    { nombre: 'OSPIP', plan: 'General' },
    { nombre: 'OSUTHGRA', plan: 'General' },
    { nombre: 'OSPLAD', plan: 'General' },
    { nombre: 'OSDOP', plan: 'General' },
    { nombre: 'OSMATA', plan: 'General' }
  ];

  for (const os of obrasSociales) {
    await prisma.obraSocial.upsert({
      where: {
        nombre_plan: {
          nombre: os.nombre,
          plan: os.plan
        }
      },
      update: {
        observaciones: os.observaciones ?? null
      },
      create: {
        nombre: os.nombre,
        plan: os.plan,
        observaciones: os.observaciones ?? null
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
