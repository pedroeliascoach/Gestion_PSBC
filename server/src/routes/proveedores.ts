import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { EstatusPago, TipoEntregable, Rol } from '@prisma/client';

const router = Router();
router.use(authenticate);

const schema = z.object({
  nombre: z.string().min(1),
  rfc: z.string().min(1),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6).optional(), // Solo requerido si no se vincula a instructor
  instructorId: z.string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});

/**
 * Asegura que un proveedor tenga todos los requisitos activos del catálogo.
 * Crea las entradas faltantes en ProveedorRequisito.
 */
async function syncProveedorRequisitos(proveedorId: string) {
  const catalogReqs = await prisma.requisitoCatalogo.findMany({ where: { activo: true } });
  const existingReqs = await prisma.proveedorRequisito.findMany({
    where: { proveedorId },
    select: { requisitoId: true }
  });

  const existingIds = new Set(existingReqs.map(r => r.requisitoId));
  const missingReqs = catalogReqs.filter(r => !existingIds.has(r.id));

  if (missingReqs.length > 0) {
    await prisma.proveedorRequisito.createMany({
      data: missingReqs.map(r => ({
        proveedorId,
        requisitoId: r.id,
        cumplido: false
      }))
    });
  }
}

router.get('/me', async (req: any, res: Response) => {
  const p = await prisma.proveedor.findFirst({
    where: { usuarioId: req.user.id } as any,
  });
  
  if (!p) return res.status(404).json({ error: 'Perfil de proveedor no encontrado' });

  // Sincronizar requisitos antes de devolver los datos
  await syncProveedorRequisitos(p.id);

  const updatedP = await prisma.proveedor.findUnique({
    where: { id: p.id },
    include: {
      requisitos: { include: { requisito: true }, orderBy: { requisito: { orden: 'asc' } } },
      entregables: true,
      capacitaciones: { include: { comunidad: { select: { nombre: true } } } },
      proyectos: { include: { comunidad: { select: { nombre: true } } } },
    },
  });

  res.json(updatedP);
});

router.get('/', async (_req, res: Response) => {
  const proveedores = await prisma.proveedor.findMany({
    include: {
      requisitos: { include: { requisito: true } },
      entregables: true,
      _count: { select: { capacitaciones: true, proyectos: true } },
    },
    orderBy: { nombre: 'asc' },
  });

  const result = proveedores.map((p) => ({
    ...p,
    cumplimientoCompleto: p.requisitos.length > 0 && p.requisitos.every((r) => r.cumplido),
    totalRequisitos: p.requisitos.length,
    requisitosCompletos: p.requisitos.filter((r) => r.cumplido).length,
  }));

  res.json(result);
});

router.get('/:id', async (req, res: Response) => {
  // Sincronizar requisitos antes de devolver los datos
  await syncProveedorRequisitos(req.params.id);

  const p = await prisma.proveedor.findUnique({
    where: { id: req.params.id },
    include: {
      requisitos: { include: { requisito: true }, orderBy: { requisito: { orden: 'asc' } } },
      entregables: true,
      capacitaciones: { include: { comunidad: { select: { nombre: true } } } },
      proyectos: { include: { comunidad: { select: { nombre: true } } } },
    },
  });
  if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(p);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { nombre, rfc, contacto, telefono, email, password, instructorId } = parsed.data;

    // Verificar si el usuario ya existe
    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists && !instructorId) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalUsuarioId = userExists?.id;

      // Si no existe el usuario y no hay instructorId, creamos uno nuevo
      if (!finalUsuarioId && !instructorId) {
        if (!password) throw new Error('Se requiere contraseña para nuevos proveedores');
        const hash = await bcrypt.hash(password, 10);
        const newUser = await tx.usuario.create({
          data: {
            nombre,
            email,
            password: hash,
            rol: Rol.PROVEEDOR
          }
        });
        finalUsuarioId = newUser.id;
      }

      // Si hay instructorId, usamos el usuarioId del instructor
      if (instructorId) {
        const inst = await tx.instructor.findUnique({ where: { id: instructorId } });
        if (!inst) throw new Error('Instructor no encontrado');
        finalUsuarioId = inst.usuarioId;
      }

      const requisitos = await tx.requisitoCatalogo.findMany({ where: { activo: true } });

      return tx.proveedor.create({
        data: {
          nombre,
          rfc,
          contacto: contacto ?? null,
          telefono: telefono ?? null,
          email: email || null,
          instructorId: instructorId || null,
          usuarioId: finalUsuarioId,
          requisitos: {
            create: requisitos.map((r) => ({ requisitoId: r.id })),
          },
          entregables: {
            create: [
              { tipo: TipoEntregable.REPORTE_FINAL },
              { tipo: TipoEntregable.FACTURA },
            ],
          },
        },
        include: { requisitos: { include: { requisito: true } }, entregables: true },
      });
    });

    res.status(201).json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear proveedor';
    console.error(e);
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  try {
    const { nombre, contacto, telefono, email, activo, password } = req.body;
    
    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (nombre) data.nombre = nombre;
      if (contacto !== undefined) data.contacto = contacto;
      if (telefono !== undefined) data.telefono = telefono;
      if (email !== undefined) data.email = email;
      if (typeof activo === 'boolean') data.activo = activo;

      const updatedProveedor = await tx.proveedor.update({ 
        where: { id: req.params.id }, 
        data 
      });

      if (password && updatedProveedor.usuarioId) {
        const hash = await bcrypt.hash(password, 10);
        await tx.usuario.update({
          where: { id: updatedProveedor.usuarioId },
          data: { 
            password: hash,
            ...(email ? { email } : {}) // Sincronizar email de usuario si cambió
          }
        });
      }
    });

    const finalProveedor = await prisma.proveedor.findUnique({ where: { id: req.params.id } });
    res.json(finalProveedor);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al actualizar proveedor';
    console.error(e);
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id/requisitos/:requisitoId', authorize('ADMIN'), upload.single('documento'), async (req, res: Response) => {
  const { cumplido, observaciones } = req.body;
  const data: Record<string, unknown> = {};
  if (cumplido !== undefined) {
    data.cumplido = cumplido === 'true' || cumplido === true;
    data.fechaCumplido = data.cumplido ? new Date() : null;
  }
  if (observaciones !== undefined) data.observaciones = observaciones;
  if (req.file) data.documento = `/uploads/${req.file.filename}`;

  const pr = await prisma.proveedorRequisito.update({
    where: { proveedorId_requisitoId: { proveedorId: req.params.id, requisitoId: req.params.requisitoId } },
    data,
    include: { requisito: true },
  });
  res.json(pr);
});

router.patch('/:id/entregables/:tipo', authorize('ADMIN'), upload.single('archivo'), async (req, res: Response) => {
  const tipo = req.params.tipo as TipoEntregable;
  const { entregado, estatusPago, observaciones } = req.body;
  const data: Record<string, unknown> = {};
  if (entregado !== undefined) {
    data.entregado = entregado === 'true' || entregado === true;
    data.fechaEntrega = data.entregado ? new Date() : null;
  }
  if (estatusPago && Object.values(EstatusPago).includes(estatusPago)) data.estatusPago = estatusPago;
  if (observaciones !== undefined) data.observaciones = observaciones;
  if (req.file) {
    data.rutaArchivo = `/uploads/${req.file.filename}`;
    data.nombreArchivo = req.file.originalname;
  }

  const pe = await prisma.proveedorEntregable.update({
    where: { proveedorId_tipo: { proveedorId: req.params.id, tipo } },
    data,
  });
  res.json(pe);
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.proveedor.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
