import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { EstatusPago, TipoEntregable } from '@prisma/client';

const router = Router();
router.use(authenticate);

const schema = z.object({
  nombre: z.string().min(1),
  rfc: z.string().min(1),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional().nullable(),
  instructorId: z.string().uuid().optional().nullable(),
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

    const requisitos = await prisma.requisitoCatalogo.findMany({ where: { activo: true } });

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: parsed.data.nombre,
        rfc: parsed.data.rfc,
        contacto: parsed.data.contacto ?? null,
        telefono: parsed.data.telefono ?? null,
        email: parsed.data.email || null,
        instructorId: parsed.data.instructorId || null,
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
    res.status(201).json(proveedor);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear proveedor';
    console.error(e);
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { nombre, contacto, telefono, email, activo } = req.body;
  const data: Record<string, unknown> = {};
  if (nombre) data.nombre = nombre;
  if (contacto !== undefined) data.contacto = contacto;
  if (telefono !== undefined) data.telefono = telefono;
  if (email !== undefined) data.email = email;
  if (typeof activo === 'boolean') data.activo = activo;

  const proveedor = await prisma.proveedor.update({ where: { id: req.params.id }, data });
  res.json(proveedor);
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
