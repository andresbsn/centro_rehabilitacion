import { Router } from 'express';

import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { toDateOnlyStr, getStartOfDay, getEndOfDay, getStartOfMonth, getEndOfMonth } from '../utils/date.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/resumen', async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = toDateOnlyStr(today);
    const startOfDay = getStartOfDay(today);
    const endOfDay = getEndOfDay(today);
    const startOfMonth = getStartOfMonth(today);
    const endOfMonth = getEndOfMonth(today);

    const [turnosHoy, cobrosPendientes, pacientesNuevosMes, turnosSemana] = await Promise.all([
      prisma.turno.findMany({
        where: {
          startAt: { gte: startOfDay, lte: endOfDay },
          estado: { not: 'CANCELADO' }
        },
        include: {
          paciente: { select: { id: true, nombre: true, apellido: true } },
          especialidad: { select: { id: true, nombre: true } },
          profesional: { select: { id: true, nombre: true } }
        },
        orderBy: { startAt: 'asc' }
      }),

      prisma.turno.aggregate({
        where: {
          cobrado: false,
          estado: { in: ['ASISTIO', 'CONFIRMADO', 'RESERVADO'] },
          importeCoseguro: { gt: 0 }
        },
        _sum: { importeCoseguro: true },
        _count: { id: true }
      }),

      prisma.paciente.count({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      }),

      prisma.turno.groupBy({
        by: ['estado'],
        where: {
          startAt: { gte: startOfDay, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        },
        _count: { id: true }
      })
    ]);

    const turnosHoySerializados = turnosHoy.map((t) => ({
      id: t.id,
      fecha: toDateOnlyStr(t.startAt),
      horaInicio: t.startAt.toISOString().slice(11, 16),
      horaFin: t.endAt.toISOString().slice(11, 16),
      paciente: t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : '-',
      especialidad: t.especialidad?.nombre || '-',
      profesional: t.profesional?.nombre || '-',
      estado: t.estado,
      cobrado: t.cobrado,
      importeCoseguro: t.importeCoseguro
    }));

    const turnosSemanaResumen = turnosSemana.reduce((acc, g) => {
      acc[g.estado] = g._count.id;
      return acc;
    }, {});

    res.json({
      fecha: todayStr,
      turnosHoy: {
        total: turnosHoy.length,
        items: turnosHoySerializados
      },
      cobrosPendientes: {
        cantidad: cobrosPendientes._count.id || 0,
        monto: cobrosPendientes._sum.importeCoseguro || 0
      },
      pacientesNuevosMes,
      turnosSemana: turnosSemanaResumen
    });
  } catch (e) {
    next(e);
  }
});
