import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (_req, res: Response) => {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [
    totalComunidades,
    comunidadesActivas,
    comunidadesPorEtapa,
    visitasMes,
    capacitacionesEnProgreso,
    proyectosEnEjecucion,
    proveedoresConPendientes,
    presupuestos,
    actividadReciente,
  ] = await Promise.all([
    prisma.comunidad.count(),
    prisma.comunidad.count({ where: { activa: true } }),
    prisma.comunidad.groupBy({ by: ['etapaActual'], _count: { id: true }, where: { activa: true } }),
    prisma.visita.count({ where: { fecha: { gte: inicioMes } } }),
    prisma.capacitacion.count({ where: { estatus: 'EN_PROGRESO' } }),
    prisma.proyecto.count({ where: { estatus: 'EN_EJECUCION' } }),
    prisma.proveedor.count({
      where: { requisitos: { some: { cumplido: false } } },
    }),
    prisma.presupuesto.findMany({
      include: { gastos: true, comunidad: { select: { nombre: true } } },
    }),
    prisma.visita.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { comunidad: { select: { nombre: true } }, promotor: { include: { usuario: { select: { nombre: true } } } } },
    }),
  ]);

  const presupuestoResumen = presupuestos.map((p) => ({
    comunidad: p.comunidad.nombre,
    anio: p.anio,
    monto: Number(p.monto),
    gastado: p.gastos.reduce((s, g) => s + Number(g.monto), 0),
  }));

  const totalPresupuesto = presupuestoResumen.reduce((s, p) => s + p.monto, 0);
  const totalGastado = presupuestoResumen.reduce((s, p) => s + p.gastado, 0);

  res.json({
    kpis: {
      totalComunidades,
      comunidadesActivas,
      visitasMes,
      capacitacionesEnProgreso,
      proyectosEnEjecucion,
      proveedoresConPendientes,
      totalPresupuesto,
      totalGastado,
      porcentajeEjecucion: totalPresupuesto > 0 ? Math.round((totalGastado / totalPresupuesto) * 100) : 0,
    },
    comunidadesPorEtapa: comunidadesPorEtapa.map((e) => ({ etapa: e.etapaActual, total: e._count.id })),
    presupuestoResumen,
    actividadReciente,
  });
});

export default router;
