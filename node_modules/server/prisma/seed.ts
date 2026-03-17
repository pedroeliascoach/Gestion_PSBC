import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@diftamaulipas.gob.mx' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@diftamaulipas.gob.mx',
      password: adminPassword,
      rol: Rol.ADMIN,
    },
  });
  console.log('Admin creado:', admin.email);

  const requisitos = [
    { nombre: 'Cotización', descripcion: 'Cotización formal del proveedor', orden: 1 },
    { nombre: 'Constancia de Situación Fiscal (CSF)', descripcion: 'Documento emitido por el SAT', orden: 2 },
    { nombre: 'Opinión de Cumplimiento SAT', descripcion: 'Opinión positiva de obligaciones fiscales', orden: 3 },
    { nombre: 'Opinión de Cumplimiento IMSS', descripcion: 'Opinión positiva de obligaciones IMSS', orden: 4 },
    { nombre: 'Opinión de Cumplimiento Infonavit', descripcion: 'Opinión positiva de obligaciones Infonavit', orden: 5 },
    { nombre: 'Firma de Contrato', descripcion: 'Contrato firmado por ambas partes (aplica según monto)', obligatorio: false, orden: 6 },
    { nombre: 'Firma de Solicitud de Cotización', descripcion: 'Solicitud de cotización firmada', orden: 7 },
  ];

  for (const req of requisitos) {
    await prisma.requisitoCatalogo.upsert({
      where: { id: req.nombre },
      update: {},
      create: {
        id: req.nombre,
        nombre: req.nombre,
        descripcion: req.descripcion,
        obligatorio: req.obligatorio ?? true,
        orden: req.orden,
      },
    });
  }
  console.log('Catálogo de requisitos creado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
