import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';

export const pagosGimnasioRouter = Router();

pagosGimnasioRouter.use(requireAuth);

const listQuerySchema = z.object({
  pacienteId: z.string().min(1).optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional()
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

pagosGimnasioRouter.post('/:id/cobrar', requireRole(['admin', 'recepcion']), async (req, res, next) => {
  try {
    const id = req.params.id;

    const existing = await prisma.pagoMensualGimnasio.findUnique({ where: { id } });
    if (!existing) return next(new HttpError(404, 'NOT_FOUND', 'Pago mensual no encontrado'));
    if (existing.cobrado) return next(badRequest('El mes ya está cobrado', 'ALREADY_PAID'));

    const updated = await prisma.pagoMensualGimnasio.update({
      where: { id },
      data: {
        cobrado: true,
        cobradoAt: new Date(),
        cobradoPorId: req.user.id
      },
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true } },
        cobradoPor: { select: { id: true, nombre: true } }
      }
    });

    res.json({ pago: updated });
  } catch (e) {
    next(e);
  }
});
