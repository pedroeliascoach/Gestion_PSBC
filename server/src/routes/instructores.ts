import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), async (_req, res: Response) => {
  const instructores = await prisma.instructor.findMany({
    include: {
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      capacitaciones: {
        include: { capacitacion: { select: { id: true, titulo: true, estatus: true, comunidad: { select: { nombre: true } } } } },
      },
    },
    orderBy: { usuario: { nombre: 'asc' } },
  });
  res.json(instructores);
});

router.get('/:id', async (req, res: Response) => {
  const i = await prisma.instructor.findUnique({
    where: { id: req.params.id },
    include: {
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      capacitaciones: { include: { capacitacion: { include: { comunidad: true } } } },
    },
  });
  if (!i) return res.status(404).json({ error: 'Instructor no encontrado' });
  res.json(i);
});

export default router;
