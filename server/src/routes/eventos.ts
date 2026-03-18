import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const schema = z.object({
  comunidadId: z.string().uuid(),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fecha: z.string(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (promotor) where.promotorId = promotor.id;
  }

  const eventos = await prisma.evento.findMany({
    where,
    include: { comunidad: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  });
  res.json(eventos);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
  const promotorId = promotor?.id ?? req.body.promotorId;
  if (!promotorId) return res.status(400).json({ error: 'promotorId requerido' });

  const evento = await prisma.evento.create({
    data: {
      comunidadId: parsed.data.comunidadId,
      promotorId,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion,
      fecha: new Date(parsed.data.fecha),
    },
  });
  res.status(201).json(evento);
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { titulo, descripcion, fecha, comunidadId } = req.body;
  const data: any = {};
  if (titulo) data.titulo = titulo;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (fecha) data.fecha = new Date(fecha);
  if (comunidadId) data.comunidadId = comunidadId;

  const evento = await prisma.evento.update({
    where: { id: req.params.id },
    data,
  });
  res.json(evento);
});

router.delete('/:id', async (req, res: Response) => {
  await prisma.evento.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
