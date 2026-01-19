import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';
import { registrarAuditoria, getClientIp } from '../services/auditoria.js';

export const pagosGimnasioRouter = Router();

pagosGimnasioRouter.use(requireAuth);

const listQuerySchema = z.object({
  pacienteId: z.string().min(1).optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const cobrarSchema = z.object({
  formaPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'OTRO']).optional().nullable(),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
});

pagosGimnasioRouter.get('/', requireRole(['admin', 'recepcion']), async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(badRequest('Query inválida', 'VALIDATION_ERROR', { details: parsed.error.issues }));

    const where = {};
    if (parsed.data.pacienteId) where.pacienteId = parsed.data.pacienteId;
    if (parsed.data.yearMonth) where.yearMonth = parsed.data.yearMonth;

    const items = await prisma.pagoMensualGimnasio.findMany({
      where,
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true } },
        cobradoPor: { select: { id: true, nombre: true } }
      },
      orderBy: [{ yearMonth: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

pagosGimnasioRouter.post(
  '/:id/cobrar',
  requireRole(['admin', 'recepcion']),
  validateBody(cobrarSchema),
  async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const existing = await prisma.pagoMensualGimnasio.findUnique({ where: { id } });
    if (!existing) return next(new HttpError(404, 'NOT_FOUND', 'Pago mensual no encontrado'));
    if (existing.cobrado) return next(badRequest('El mes ya está cobrado', 'ALREADY_PAID'));

    const pagoDate = data.fechaPago ? new Date(`${data.fechaPago}T00:00:00.000Z`) : new Date();

    const [yearStr, monthStr] = String(existing.yearMonth).split('-');
    const year = Number(yearStr);
    const monthIndex0 = Number(monthStr) - 1;
    const monthStart = new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, monthIndex0 + 1, 1, 0, 0, 0, 0));

    const especialidad = await prisma.especialidad.findFirst({
      where: { nombre: { equals: 'Gimnasio', mode: 'insensitive' } },
      select: { id: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedPago = await tx.pagoMensualGimnasio.update({
        where: { id },
        data: {
          cobrado: true,
          cobradoAt: pagoDate,
          cobradoPorId: req.user.id,
          formaPago: data.formaPago || null
        },
        include: {
          paciente: { select: { id: true, nombre: true, apellido: true } },
          cobradoPor: { select: { id: true, nombre: true } }
        }
      });

      let updatedTurnosCount = 0;
      if (especialidad?.id) {
        const upd = await tx.turno.updateMany({
          where: {
            pacienteId: existing.pacienteId,
            especialidadId: especialidad.id,
            startAt: { gte: monthStart, lt: monthEnd },
            cobrado: false
          },
          data: {
            cobrado: true,
            cobradoAt: pagoDate,
            cobradoPorId: req.user.id
          }
        });
        updatedTurnosCount = upd.count;
      }

      return { pago: updatedPago, updatedTurnosCount };
    });

    registrarAuditoria({
      accion: 'COBRAR_GIMNASIO',
      entidad: 'PagoMensualGimnasio',
      entidadId: id,
      usuarioId: req.user?.id,
      datos: { yearMonth: existing.yearMonth, pacienteId: existing.pacienteId, formaPago: data.formaPago },
      ip: getClientIp(req)
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
}
);
