import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { EstatusCapacitacion } from '@prisma/client';

const router = Router();
router.use(authenticate);

const schema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  comunidadId: z.string().uuid(),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
  proveedorId: z.string().uuid().optional().nullable(),
  instructorIds: z.array(z.string().uuid()).optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;
  if (req.query.estatus) where.estatus = req.query.estatus;

  if (req.user!.rol === 'INSTRUCTOR') {
    const instructor = await prisma.instructor.findUnique({ where: { usuarioId: req.user!.id } });
    if (!instructor) return res.json([]);
    where.instructores = { some: { instructorId: instructor.id } };
  }

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (!promotor) return res.json([]);
    const asignadas = await prisma.comunidadPromotor.findMany({
      where: { promotorId: promotor.id, activo: true },
      select: { comunidadId: true },
    });
    where.comunidadId = { in: asignadas.map((a) => a.comunidadId) };
  }

  const items = await prisma.capacitacion.findMany({
    where,
    include: {
      comunidad: { select: { nombre: true, municipio: true } },
      proveedor: { select: { nombre: true, rfc: true } },
      instructores: { include: { instructor: { include: { usuario: { select: { nombre: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

router.get('/:id', async (req, res: Response) => {
  const item = await prisma.capacitacion.findUnique({
    where: { id: req.params.id },
    include: {
      comunidad: true,
      proveedor: { include: { requisitos: { include: { requisito: true } } } },
      instructores: { include: { instructor: { include: { usuario: { select: { nombre: true, email: true } } } } } },
      reportes: { orderBy: { createdAt: 'desc' } },
      fotografias: true,
    },
  });
  if (!item) return res.status(404).json({ error: 'Capacitación no encontrada' });
  res.json(item);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { titulo, descripcion, comunidadId, fechaInicio, fechaFin, proveedorId, instructorIds } = parsed.data;

  const capacitacion = await prisma.capacitacion.create({
    data: {
      titulo,
      descripcion,
      comunidadId,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      proveedorId: proveedorId ?? null,
      instructores: instructorIds?.length
        ? { create: instructorIds.map((id) => ({ instructorId: id })) }
        : undefined,
    },
    include: { comunidad: true, instructores: true },
  });
  res.status(201).json(capacitacion);
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { titulo, descripcion, fechaInicio, fechaFin, proveedorId, instructorIds } = req.body;
  const data: Record<string, unknown> = {};
  if (titulo) data.titulo = titulo;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (fechaInicio !== undefined) data.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
  if (fechaFin !== undefined) data.fechaFin = fechaFin ? new Date(fechaFin) : null;
  if (proveedorId !== undefined) data.proveedorId = proveedorId || null;

  if (instructorIds) {
    await prisma.capacitacionInstructor.deleteMany({ where: { capacitacionId: req.params.id } });
    data.instructores = { create: instructorIds.map((id: string) => ({ instructorId: id })) };
  }

  const capacitacion = await prisma.capacitacion.update({ where: { id: req.params.id }, data });
  res.json(capacitacion);
});

router.patch('/:id/estatus', async (req: AuthRequest, res: Response) => {
  const { estatus } = req.body as { estatus: EstatusCapacitacion };
  const valid = Object.values(EstatusCapacitacion);
  if (!valid.includes(estatus)) return res.status(400).json({ error: 'Estatus inválido' });

  if (estatus === 'EN_PROGRESO') {
    const cap = await prisma.capacitacion.findUnique({ where: { id: req.params.id } });
    if (cap?.proveedorId) {
      const pendientes = await prisma.proveedorRequisito.count({
        where: { proveedorId: cap.proveedorId, cumplido: false },
      });
      if (pendientes > 0) {
        return res.status(400).json({ error: 'El proveedor tiene requisitos pendientes de cumplir' });
      }
    }
  }

  const capacitacion = await prisma.capacitacion.update({
    where: { id: req.params.id },
    data: { estatus },
  });
  res.json(capacitacion);
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.capacitacion.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
