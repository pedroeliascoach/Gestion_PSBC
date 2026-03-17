import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), async (_req, res: Response) => {
  const promotores = await prisma.promotor.findMany({
    include: {
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      comunidades: {
        where: { activo: true },
        include: { comunidad: { select: { id: true, nombre: true, municipio: true, etapaActual: true } } },
      },
    },
    orderBy: { usuario: { nombre: 'asc' } },
  });
  res.json(promotores);
});

router.get('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const p = await prisma.promotor.findUnique({
    where: { id: req.params.id },
    include: {
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      comunidades: { include: { comunidad: true } },
      visitas: { orderBy: { fecha: 'desc' }, take: 10 },
    },
  });
  if (!p) return res.status(404).json({ error: 'Promotor no encontrado' });
  res.json(p);
});

router.post('/:id/comunidades', authorize('ADMIN'), async (req, res: Response) => {
  const { comunidadId } = req.body;
  const asignacion = await prisma.comunidadPromotor.upsert({
    where: { comunidadId_promotorId: { comunidadId, promotorId: req.params.id } },
    update: { activo: true },
    create: { comunidadId, promotorId: req.params.id },
  });
  res.status(201).json(asignacion);
});

router.delete('/:id/comunidades/:comunidadId', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.comunidadPromotor.updateMany({
    where: { promotorId: req.params.id, comunidadId: req.params.comunidadId },
    data: { activo: false },
  });
  res.status(204).send();
});

export default router;
