import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const schema = z.object({
  nombre: z.string().min(1),
  municipio: z.string().min(1),
  estado: z.string().optional(),
  etapaActual: z.number().int().min(1).max(4).optional(),
  fechaIngreso: z.string(),
  fechaEgreso: z.string().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.activa !== undefined) where.activa = req.query.activa === 'true';
  if (req.query.etapa) where.etapaActual = parseInt(req.query.etapa as string);

  if (req.user!.rol === 'PROMOTOR') {
    const promotor = await prisma.promotor.findUnique({ where: { usuarioId: req.user!.id } });
    if (!promotor) return res.json([]);
    const asignadas = await prisma.comunidadPromotor.findMany({
      where: { promotorId: promotor.id, activo: true },
      select: { comunidadId: true },
    });
    where.id = { in: asignadas.map((a) => a.comunidadId) };
  }

  const comunidades = await prisma.comunidad.findMany({
    where,
    include: {
      promotores: { where: { activo: true }, include: { promotor: { include: { usuario: { select: { nombre: true, email: true } } } } } },
      _count: { select: { capacitaciones: true, proyectos: true, visitas: true } },
    },
    orderBy: { nombre: 'asc' },
  });
  res.json(comunidades);
});

router.get('/:id', async (req, res: Response) => {
  const c = await prisma.comunidad.findUnique({
    where: { id: req.params.id },
    include: {
      promotores: { include: { promotor: { include: { usuario: { select: { nombre: true, email: true, id: true } } } } } },
      capacitaciones: { include: { proveedor: true, instructores: { include: { instructor: { include: { usuario: { select: { nombre: true } } } } } } } },
      proyectos: { include: { proveedor: true } },
      visitas: { orderBy: { fecha: 'desc' }, take: 10 },
      presupuestos: { include: { gastos: true } },
      historicoEtapas: { orderBy: { fechaInicio: 'asc' } },
    },
  });
  if (!c) return res.status(404).json({ error: 'Comunidad no encontrada' });
  res.json(c);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { nombre, municipio, estado, etapaActual, fechaIngreso, fechaEgreso } = parsed.data;
    const etapa = etapaActual ?? 1;
    const fechaIngresoDate = fechaIngreso ? new Date(fechaIngreso) : new Date();

    const comunidad = await prisma.comunidad.create({
      data: {
        nombre,
        municipio,
        estado: estado ?? 'Tamaulipas',
        etapaActual: etapa,
        fechaIngreso: fechaIngresoDate,
        fechaEgreso: fechaEgreso ? new Date(fechaEgreso) : null,
        historicoEtapas: { create: { etapa, fechaInicio: fechaIngresoDate } },
      },
    });
    res.status(201).json(comunidad);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear comunidad' });
  }
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { nombre, municipio, estado, fechaEgreso, activa } = req.body;
  const data: Record<string, unknown> = {};
  if (nombre) data.nombre = nombre;
  if (municipio) data.municipio = municipio;
  if (estado) data.estado = estado;
  if (typeof activa === 'boolean') data.activa = activa;
  if (fechaEgreso !== undefined) data.fechaEgreso = fechaEgreso ? new Date(fechaEgreso) : null;

  const comunidad = await prisma.comunidad.update({ where: { id: req.params.id }, data });
  res.json(comunidad);
});

router.patch('/:id/etapa', authorize('ADMIN'), async (req, res: Response) => {
  const { etapa } = req.body;
  if (!etapa || etapa < 1 || etapa > 4) return res.status(400).json({ error: 'Etapa inválida (1-4)' });

  const comunidad = await prisma.comunidad.findUnique({ where: { id: req.params.id } });
  if (!comunidad) return res.status(404).json({ error: 'Comunidad no encontrada' });

  const ahora = new Date();
  await prisma.$transaction([
    prisma.historicoEtapa.updateMany({
      where: { comunidadId: req.params.id, fechaFin: null },
      data: { fechaFin: ahora },
    }),
    prisma.historicoEtapa.create({
      data: { comunidadId: req.params.id, etapa, fechaInicio: ahora },
    }),
    prisma.comunidad.update({ where: { id: req.params.id }, data: { etapaActual: etapa } }),
  ]);

  res.json({ mensaje: 'Etapa actualizada', etapa });
});

router.delete('/:id', authorize('ADMIN'), async (req, res: Response) => {
  await prisma.comunidad.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
