import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const schema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  obligatorio: z.boolean().optional(),
  orden: z.number().int().optional(),
});

router.get('/', async (_req, res: Response) => {
  const requisitos = await prisma.requisitoCatalogo.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' },
  });
  res.json(requisitos);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const req2 = await prisma.requisitoCatalogo.create({ data: parsed.data });
  res.status(201).json(req2);
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { nombre, descripcion, obligatorio, orden, activo } = req.body;
  const data: Record<string, unknown> = {};
  if (nombre) data.nombre = nombre;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (typeof obligatorio === 'boolean') data.obligatorio = obligatorio;
  if (orden !== undefined) data.orden = orden;
  if (typeof activo === 'boolean') data.activo = activo;

  const req2 = await prisma.requisitoCatalogo.update({ where: { id: req.params.id }, data });
  res.json(req2);
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.requisitoCatalogo.update({ where: { id: req.params.id }, data: { activo: false } });
  res.status(204).send();
});

export default router;
