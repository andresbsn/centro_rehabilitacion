import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';

export const obrasSocialesRouter = Router();

obrasSocialesRouter.use(requireAuth);

const obraSocialCreateSchema = z.object({
  nombre: z.string().min(1),
  plan: z.string().min(1).optional().nullable(),
  observaciones: z.string().min(1).optional().nullable()
});

const obraSocialUpdateSchema = obraSocialCreateSchema.partial();

obrasSocialesRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';

    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { plan: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const items = await prisma.obraSocial.findMany({
      where,
      orderBy: [{ nombre: 'asc' }, { plan: 'asc' }],
      take: 100
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

obrasSocialesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const obraSocial = await prisma.obraSocial.findUnique({ where: { id } });

    if (!obraSocial) return next(new HttpError(404, 'NOT_FOUND', 'Obra social no encontrada'));

    res.json({ obraSocial });
  } catch (e) {
    next(e);
  }
});

obrasSocialesRouter.post('/', requireRole(['admin', 'recepcion']), validateBody(obraSocialCreateSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const obraSocial = await prisma.obraSocial.create({
      data: {
        nombre: data.nombre,
        plan: data.plan || null,
        observaciones: data.observaciones || null
      }
    });

    res.status(201).json({ obraSocial });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('Obra social duplicada (nombre/plan)', 'DUPLICATE'));
    }
    next(e);
  }
});

obrasSocialesRouter.put('/:id', requireRole(['admin', 'recepcion']), validateBody(obraSocialUpdateSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const exists = await prisma.obraSocial.findUnique({ where: { id } });
    if (!exists) return next(new HttpError(404, 'NOT_FOUND', 'Obra social no encontrada'));

    const obraSocial = await prisma.obraSocial.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.plan !== undefined ? { plan: data.plan } : {}),
        ...(data.observaciones !== undefined ? { observaciones: data.observaciones } : {})
      }
    });

    res.json({ obraSocial });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('Obra social duplicada (nombre/plan)', 'DUPLICATE'));
    }
    next(e);
  }
});
