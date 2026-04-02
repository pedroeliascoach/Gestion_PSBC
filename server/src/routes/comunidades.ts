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
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  habitantes: z.number().int().optional().nullable(),
  infraestructura: z.string().optional().nullable(),
  recursosNaturales: z.string().optional().nullable(),
  economia: z.string().optional().nullable(),
  cultura: z.string().optional().nullable(),
  grupoDesarrolloFormado: z.boolean().optional(),
  fechaConstitucionGrupo: z.string().optional().nullable(),
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
      integrantesGrupo: true,
    },
  });
  if (!c) return res.status(404).json({ error: 'Comunidad no encontrada' });
  res.json(c);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { 
      nombre, municipio, estado, etapaActual, fechaIngreso, fechaEgreso,
      latitud, longitud, habitantes, infraestructura, recursosNaturales, economia, cultura,
      grupoDesarrolloFormado, fechaConstitucionGrupo
    } = parsed.data;
    
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
        latitud,
        longitud,
        habitantes,
        infraestructura,
        recursosNaturales,
        economia,
        cultura,
        grupoDesarrolloFormado: grupoDesarrolloFormado ?? false,
        fechaConstitucionGrupo: fechaConstitucionGrupo ? new Date(fechaConstitucionGrupo) : null,
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
  const { 
    nombre, municipio, estado, fechaEgreso, activa, 
    latitud, longitud, habitantes, infraestructura, recursosNaturales, economia, cultura,
    grupoDesarrolloFormado, fechaConstitucionGrupo, integrantesGrupo 
  } = req.body;
  
  const data: any = {};
  if (nombre) data.nombre = nombre;
  if (municipio) data.municipio = municipio;
  if (estado) data.estado = estado;
  if (typeof activa === 'boolean') data.activa = activa;
  if (fechaEgreso !== undefined) data.fechaEgreso = fechaEgreso ? new Date(fechaEgreso) : null;
  
  if (latitud !== undefined) data.latitud = latitud;
  if (longitud !== undefined) data.longitud = longitud;
  if (habitantes !== undefined) data.habitantes = habitantes;
  if (infraestructura !== undefined) data.infraestructura = infraestructura;
  if (recursosNaturales !== undefined) data.recursosNaturales = recursosNaturales;
  if (economia !== undefined) data.economia = economia;
  if (cultura !== undefined) data.cultura = cultura;
  if (grupoDesarrolloFormado !== undefined) data.grupoDesarrolloFormado = grupoDesarrolloFormado;
  if (fechaConstitucionGrupo !== undefined) data.fechaConstitucionGrupo = fechaConstitucionGrupo ? new Date(fechaConstitucionGrupo) : null;

  if (integrantesGrupo && Array.isArray(integrantesGrupo)) {
    data.integrantesGrupo = {
      deleteMany: {},
      create: integrantesGrupo.map((i: any) => ({
        nombre: i.nombre,
        edad: i.edad,
        rol: i.rol
      }))
    };
  }

  const comunidad = await prisma.comunidad.update({ where: { id: req.params.id }, data });
  res.json(comunidad);
});

router.patch('/:id/etapa', authorize('ADMIN'), async (req, res: Response) => {
  const { etapa } = req.body;
  const comunidad = await prisma.comunidad.findUnique({ where: { id: req.params.id } });
  if (!comunidad) return res.status(404).json({ error: 'Comunidad no encontrada' });

  // Validaciones de progresión:
  // 1. Debe ser la siguiente etapa correlativa (actual + 1)
  // 2. No se puede retroceder
  // 3. No puede exceder la etapa 4
  if (etapa !== comunidad.etapaActual + 1) {
    return res.status(400).json({ 
      error: `Solo se permite avanzar a la siguiente etapa (${comunidad.etapaActual + 1}). No se puede retroceder ni saltar etapas.` 
    });
  }

  if (etapa > 4) return res.status(400).json({ error: 'La comunidad ya está en la etapa final.' });

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
