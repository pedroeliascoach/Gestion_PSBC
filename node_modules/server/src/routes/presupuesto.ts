import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), async (req, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;
  if (req.query.anio) where.anio = parseInt(req.query.anio as string);

  const presupuestos = await prisma.presupuesto.findMany({
    where,
    include: {
      comunidad: { select: { nombre: true, municipio: true } },
      gastos: { include: { proveedor: { select: { nombre: true } } } },
    },
    orderBy: [{ anio: 'desc' }, { comunidad: { nombre: 'asc' } }],
  });

  const result = presupuestos.map((p) => ({
    ...p,
    gastado: p.gastos.reduce((sum, g) => sum + Number(g.monto), 0),
    saldo: Number(p.monto) - p.gastos.reduce((sum, g) => sum + Number(g.monto), 0),
  }));

  res.json(result);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  const schema = z.object({
    comunidadId: z.string().uuid(),
    anio: z.number().int(),
    monto: z.number().positive(),
    descripcion: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const presupuesto = await prisma.presupuesto.upsert({
    where: { comunidadId_anio: { comunidadId: parsed.data.comunidadId, anio: parsed.data.anio } },
    update: { monto: parsed.data.monto, descripcion: parsed.data.descripcion },
    create: parsed.data,
  });
  res.status(201).json(presupuesto);
});

router.post('/:id/gastos', authorize('ADMIN'), async (req, res: Response) => {
  const schema = z.object({
    concepto: z.string().min(1),
    monto: z.number().positive(),
    fecha: z.string(),
    proveedorId: z.string().uuid().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const gasto = await prisma.gasto.create({
    data: {
      presupuestoId: req.params.id,
      concepto: parsed.data.concepto,
      monto: parsed.data.monto,
      fecha: new Date(parsed.data.fecha),
      proveedorId: parsed.data.proveedorId ?? null,
    },
  });
  res.status(201).json(gasto);
});

router.delete('/:id/gastos/:gastoId', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.gasto.delete({ where: { id: req.params.gastoId } });
  res.status(204).send();
});

export default router;
