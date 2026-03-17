import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import path from 'path';

const router = Router();
router.use(authenticate);

const schema = z.object({
  comunidadId: z.string().uuid(),
  fecha: z.string(),
  descripcion: z.string().optional(),
  observaciones: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.comunidadId) where.comunidadId = req.query.comunidadId;

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (promotor) where.promotorId = promotor.id;
  }

  const visitas = await prisma.visita.findMany({
    where,
    include: {
      comunidad: { select: { nombre: true, municipio: true } },
      promotor: { include: { usuario: { select: { nombre: true } } } },
      fotografias: true,
    },
    orderBy: { fecha: 'desc' },
  });
  res.json(visitas);
});

router.get('/:id', async (req, res: Response) => {
  const v = await prisma.visita.findUnique({
    where: { id: req.params.id },
    include: {
      comunidad: true,
      promotor: { include: { usuario: { select: { nombre: true, email: true } } } },
      reportes: true,
      fotografias: true,
    },
  });
  if (!v) return res.status(404).json({ error: 'Visita no encontrada' });
  res.json(v);
});

router.post('/', upload.array('fotos', 10), async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
  if (!promotor && req.user!.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo promotores pueden registrar visitas' });
  }

  const promotorId = promotor?.id ?? req.body.promotorId;
  if (!promotorId) return res.status(400).json({ error: 'promotorId requerido' });

  const files = (req.files as Express.Multer.File[]) ?? [];

  const visita = await prisma.visita.create({
    data: {
      comunidadId: parsed.data.comunidadId,
      promotorId,
      fecha: new Date(parsed.data.fecha),
      descripcion: parsed.data.descripcion,
      observaciones: parsed.data.observaciones,
      fotografias: files.length
        ? {
            create: files.map((f) => ({
              rutaArchivo: `/uploads/${f.filename}`,
              nombreOriginal: f.originalname,
            })),
          }
        : undefined,
    },
    include: { fotografias: true },
  });
  res.status(201).json(visita);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.visita.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
