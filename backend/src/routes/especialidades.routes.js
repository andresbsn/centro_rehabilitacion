import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';

export const especialidadesRouter = Router();

especialidadesRouter.use(requireAuth);

const especialidadCreateSchema = z.object({
  nombre: z.string().min(1),
  duracionTurnoMin: z.number().int().min(5).max(180),
  activa: z.boolean().optional()
});

const especialidadUpdateSchema = especialidadCreateSchema.partial();

especialidadesRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';

    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const items = await prisma.especialidad.findMany({
      where,
      orderBy: [{ nombre: 'asc' }],
      take: 200
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

especialidadesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const especialidad = await prisma.especialidad.findUnique({ where: { id } });

    if (!especialidad) return next(new HttpError(404, 'NOT_FOUND', 'Especialidad no encontrada'));

    res.json({ especialidad });
  } catch (e) {
    next(e);
  }
});

especialidadesRouter.post('/', requireRole(['admin']), validateBody(especialidadCreateSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const especialidad = await prisma.especialidad.create({
      data: {
        nombre: data.nombre,
        duracionTurnoMin: data.duracionTurnoMin,
        activa: data.activa ?? true
      }
    });

    res.status(201).json({ especialidad });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('Especialidad duplicada (nombre)', 'DUPLICATE'));
    }
    next(e);
  }
});

especialidadesRouter.put('/:id', requireRole(['admin']), validateBody(especialidadUpdateSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const exists = await prisma.especialidad.findUnique({ where: { id } });
    if (!exists) return next(new HttpError(404, 'NOT_FOUND', 'Especialidad no encontrada'));

    const especialidad = await prisma.especialidad.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.duracionTurnoMin !== undefined ? { duracionTurnoMin: data.duracionTurnoMin } : {}),
        ...(data.activa !== undefined ? { activa: data.activa } : {})
      }
    });

    res.json({ especialidad });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('Especialidad duplicada (nombre)', 'DUPLICATE'));
    }
    next(e);
  }
});

especialidadesRouter.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const id = req.params.id;

    const especialidad = await prisma.especialidad.findUnique({ where: { id } });
    if (!especialidad) return next(new HttpError(404, 'NOT_FOUND', 'Especialidad no encontrada'));

    const updated = await prisma.especialidad.update({
      where: { id },
      data: { activa: false }
    });

    res.json({ especialidad: updated });
  } catch (e) {
    next(e);
  }
});
