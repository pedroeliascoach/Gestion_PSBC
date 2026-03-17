import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.post('/', upload.array('fotos', 10), async (req, res: Response) => {
  const { visitaId, capacitacionId, proyectoId, reporteId, descripcion } = req.body;
  const files = (req.files as Express.Multer.File[]) ?? [];

  if (!files.length) return res.status(400).json({ error: 'No se enviaron archivos' });

  const creadas = await prisma.$transaction(
    files.map((f) =>
      prisma.fotografia.create({
        data: {
          rutaArchivo: `/uploads/${f.filename}`,
          nombreOriginal: f.originalname,
          descripcion,
          visitaId: visitaId || null,
          capacitacionId: capacitacionId || null,
          proyectoId: proyectoId || null,
          reporteId: reporteId || null,
        },
      })
    )
  );

  res.status(201).json(creadas);
});

router.get('/', async (req, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.visitaId) where.visitaId = req.query.visitaId;
  if (req.query.capacitacionId) where.capacitacionId = req.query.capacitacionId;
  if (req.query.proyectoId) where.proyectoId = req.query.proyectoId;
  if (req.query.reporteId) where.reporteId = req.query.reporteId;

  const fotos = await prisma.fotografia.findMany({ where, orderBy: { fecha: 'desc' } });
  res.json(fotos);
});

router.delete('/:id', async (req, res: Response) => {
  await prisma.fotografia.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
