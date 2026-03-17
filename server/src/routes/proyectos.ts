import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { EstatusProyecto } from '@prisma/client';

const router = Router();
router.use(authenticate);

const schema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  comunidadId: z.string().uuid(),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
  presupuesto: z.number().optional().nullable(),
  proveedorId: z.string().uuid().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;
  if (req.query.estatus) where.estatus = req.query.estatus;

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (!promotor) return res.json([]);
    const asignadas = await prisma.comunidadPromotor.findMany({
      where: { promotorId: promotor.id, activo: true },
      select: { comunidadId: true },
    });
    where.comunidadId = { in: asignadas.map((a) => a.comunidadId) };
  }

  const items = await prisma.proyecto.findMany({
    where,
    include: {
      comunidad: { select: { nombre: true, municipio: true } },
      proveedor: { select: { nombre: true, rfc: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

router.get('/:id', async (req, res: Response) => {
  const item = await prisma.proyecto.findUnique({
    where: { id: req.params.id },
    include: {
      comunidad: true,
      proveedor: { include: { requisitos: { include: { requisito: true } } } },
      reportes: { orderBy: { createdAt: 'desc' } },
      fotografias: true,
    },
  });
  if (!item) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(item);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { nombre, descripcion, comunidadId, fechaInicio, fechaFin, presupuesto, proveedorId } = parsed.data;
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      descripcion,
      comunidadId,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      presupuesto: presupuesto ?? null,
      proveedorId: proveedorId ?? null,
    },
    include: { comunidad: true },
  });
  res.status(201).json(proyecto);
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { nombre, descripcion, fechaInicio, fechaFin, presupuesto, proveedorId } = req.body;
  const data: Record<string, unknown> = {};
  if (nombre) data.nombre = nombre;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (fechaInicio !== undefined) data.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
  if (fechaFin !== undefined) data.fechaFin = fechaFin ? new Date(fechaFin) : null;
  if (presupuesto !== undefined) data.presupuesto = presupuesto;
  if (proveedorId !== undefined) data.proveedorId = proveedorId || null;

  const proyecto = await prisma.proyecto.update({ where: { id: req.params.id }, data });
  res.json(proyecto);
});

router.patch('/:id/estatus', async (req: AuthRequest, res: Response) => {
  const { estatus } = req.body as { estatus: EstatusProyecto };
  const valid = Object.values(EstatusProyecto);
  if (!valid.includes(estatus)) return res.status(400).json({ error: 'Estatus inválido' });

  if (estatus === 'EN_EJECUCION') {
    const proy = await prisma.proyecto.findUnique({ where: { id: req.params.id } });
    if (proy?.proveedorId) {
      const pendientes = await prisma.proveedorRequisito.count({
        where: { proveedorId: proy.proveedorId, cumplido: false },
      });
      if (pendientes > 0) {
        return res.status(400).json({ error: 'El proveedor tiene requisitos pendientes de cumplir' });
      }
    }
  }

  const proyecto = await prisma.proyecto.update({ where: { id: req.params.id }, data: { estatus } });
  res.json(proyecto);
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.proyecto.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
