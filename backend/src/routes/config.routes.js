import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const configRouter = Router();

configRouter.use(requireAuth);

const cosegurosUpdateSchema = z.object({
  coseguro1: z.number().int().min(0).optional(),
  coseguro2: z.number().int().min(0).optional()
});

async function getOrCreateCoseguros() {
  const id = 'default';
  const existing = await prisma.configuracionCoseguros.findUnique({ where: { id } });
  if (existing) return existing;

  return prisma.configuracionCoseguros.create({
    data: {
      id,
      coseguro1: 0,
      coseguro2: 0
    }
  });
}

configRouter.get('/coseguros', async (req, res, next) => {
  try {
    const config = await getOrCreateCoseguros();
    res.json({ config });
  } catch (e) {
    next(e);
  }
});

configRouter.put('/coseguros', requireRole(['admin', 'recepcion']), validateBody(cosegurosUpdateSchema), async (req, res, next) => {
  try {
    const current = await getOrCreateCoseguros();
    const data = req.body;

    const updated = await prisma.configuracionCoseguros.update({
      where: { id: current.id },
      data: {
        ...(data.coseguro1 !== undefined ? { coseguro1: data.coseguro1 } : {}),
        ...(data.coseguro2 !== undefined ? { coseguro2: data.coseguro2 } : {})
      }
    });

    res.json({ config: updated });
  } catch (e) {
    next(e);
  }
});
