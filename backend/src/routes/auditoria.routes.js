import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const auditoriaRouter = Router();

auditoriaRouter.use(requireAuth);
auditoriaRouter.use(requireRole(['admin']));

const listQuerySchema = z.object({
  entidad: z.string().optional(),
  accion: z.string().optional(),
  usuarioId: z.string().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

auditoriaRouter.get('/', async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Query inválida', details: parsed.error.issues });
    }

    const { entidad, accion, usuarioId, desde, hasta, page, pageSize } = parsed.data;

    const where = {};

    if (entidad) where.entidad = entidad;
    if (accion) where.accion = { contains: accion, mode: 'insensitive' };
    if (usuarioId) where.usuarioId = usuarioId;

    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) {
        const end = new Date(`${hasta}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + 1);
        where.createdAt.lt = end;
      }
    }

    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      prisma.auditoria.count({ where }),
      prisma.auditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          usuario: { select: { id: true, nombre: true, email: true } }
        }
      })
    ]);

    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

auditoriaRouter.get('/entidades', async (req, res, next) => {
  try {
    const entidades = await prisma.auditoria.findMany({
      distinct: ['entidad'],
      select: { entidad: true }
    });
    res.json({ entidades: entidades.map((e) => e.entidad) });
  } catch (e) {
    next(e);
  }
});

auditoriaRouter.get('/acciones', async (req, res, next) => {
  try {
    const acciones = await prisma.auditoria.findMany({
      distinct: ['accion'],
      select: { accion: true }
    });
    res.json({ acciones: acciones.map((a) => a.accion) });
  } catch (e) {
    next(e);
  }
});
