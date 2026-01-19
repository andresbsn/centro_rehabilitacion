import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest } from '../utils/httpError.js';
import { parseUtcDateOnly, toDateOnlyStr, buildDateRangeFilter } from '../utils/date.js';

export const reportesRouter = Router();

reportesRouter.use(requireAuth);
reportesRouter.use(requireRole(['admin']));

const resumenQuerySchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

reportesRouter.get('/resumen', async (req, res, next) => {
  try {
    const parsed = resumenQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(badRequest('Query inválida', 'VALIDATION_ERROR', { details: parsed.error.issues }));

    const { desde, hasta } = parsed.data;

    const where = buildDateRangeFilter(desde, hasta, 'startAt');

    const turnos = await prisma.turno.findMany({
      where,
      select: {
        id: true,
        startAt: true,
        importeCoseguro: true,
        cobrado: true,
        pacienteId: true,
        especialidadId: true,
        paciente: { select: { id: true, nombre: true, apellido: true } },
        especialidad: { select: { id: true, nombre: true } }
      }
    });

    const totalTurnos = turnos.length;
    const totalPagados = turnos.filter((t) => t.cobrado).length;
    const deudaTotal = turnos.reduce((acc, t) => acc + (t.cobrado ? 0 : Number(t.importeCoseguro || 0)), 0);
    const totalCoseguro = turnos.reduce((acc, t) => acc + Number(t.importeCoseguro || 0), 0);

    const porPacienteMap = new Map();
    const porEspecialidadMap = new Map();
    const porDiaMap = new Map();

    for (const t of turnos) {
      const pacienteKey = t.pacienteId;
      const pacienteLabel = t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : t.pacienteId;
      const espKey = t.especialidadId;
      const espLabel = t.especialidad?.nombre || t.especialidadId;
      const fecha = toDateOnlyStr(new Date(t.startAt));

      if (!porPacienteMap.has(pacienteKey)) {
        porPacienteMap.set(pacienteKey, { pacienteId: pacienteKey, paciente: pacienteLabel, total: 0, pagados: 0, deuda: 0 });
      }
      if (!porEspecialidadMap.has(espKey)) {
        porEspecialidadMap.set(espKey, { especialidadId: espKey, especialidad: espLabel, total: 0, pagados: 0, deuda: 0 });
      }
      if (!porDiaMap.has(fecha)) {
        porDiaMap.set(fecha, { fecha, total: 0, pagados: 0, deuda: 0 });
      }

      const monto = Number(t.importeCoseguro || 0);
      const pagado = Boolean(t.cobrado);

      const p = porPacienteMap.get(pacienteKey);
      p.total += 1;
      if (pagado) p.pagados += 1;
      else p.deuda += monto;

      const e = porEspecialidadMap.get(espKey);
      e.total += 1;
      if (pagado) e.pagados += 1;
      else e.deuda += monto;

      const d = porDiaMap.get(fecha);
      d.total += 1;
      if (pagado) d.pagados += 1;
      else d.deuda += monto;
    }

    const porPaciente = Array.from(porPacienteMap.values())
      .sort((a, b) => b.deuda - a.deuda || b.total - a.total)
      .slice(0, 10);

    const porEspecialidad = Array.from(porEspecialidadMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const porDia = Array.from(porDiaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    res.json({
      range: { desde: desde || null, hasta: hasta || null },
      totals: {
        turnos: totalTurnos,
        pagados: totalPagados,
        deuda: deudaTotal,
        coseguroTotal: totalCoseguro,
        porcentajeCobro: totalTurnos ? Math.round((totalPagados / totalTurnos) * 100) : 0,
        coseguroPromedio: totalTurnos ? Math.round(totalCoseguro / totalTurnos) : 0
      },
      top: {
        pacientes: porPaciente,
        especialidades: porEspecialidad
      },
      series: {
        porDia
      }
    });
  } catch (e) {
    next(e);
  }
});
