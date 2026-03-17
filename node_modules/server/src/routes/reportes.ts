import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { TipoReporte } from '@prisma/client';

const router = Router();
router.use(authenticate);

const schema = z.object({
  titulo: z.string().min(1),
  contenido: z.string().min(1),
  tipo: z.nativeEnum(TipoReporte),
  comunidadId: z.string().uuid().optional().nullable(),
  capacitacionId: z.string().uuid().optional().nullable(),
  proyectoId: z.string().uuid().optional().nullable(),
  visitaId: z.string().uuid().optional().nullable(),
  porcentajeAvance: z.number().int().min(0).max(100).optional().nullable(),
  temasImpartidos: z.string().optional().nullable(),
  asistentes: z.number().int().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.tipo) where.tipo = req.query.tipo;
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;
  if (req.query.capacitacionId) where.capacitacionId = req.query.capacitacionId;
  if (req.query.proyectoId) where.proyectoId = req.query.proyectoId;

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (promotor) where.autorUsuarioId = req.user!.id;
  }
  if (req.user!.rol === 'INSTRUCTOR') {
    where.autorUsuarioId = req.user!.id;
  }

  const reportes = await prisma.reporte.findMany({
    where,
    include: {
      comunidad: { select: { nombre: true } },
      fotografias: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reportes);
});

router.get('/:id', async (req, res: Response) => {
  const r = await prisma.reporte.findUnique({
    where: { id: req.params.id },
    include: { comunidad: true, capacitacion: true, proyecto: true, visita: true, fotografias: true },
  });
  if (!r) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(r);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reporte = await prisma.reporte.create({
    data: {
      ...parsed.data,
      autorUsuarioId: req.user!.id,
    },
  });
  res.status(201).json(reporte);
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.reporte.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
