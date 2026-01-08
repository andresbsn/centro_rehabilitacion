import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const usuariosRouter = Router();

usuariosRouter.use(requireAuth);

usuariosRouter.get('/profesionales', async (req, res, next) => {
  try {
    const profesionales = await prisma.user.findMany({
      where: {
        role: {
          name: 'profesional'
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({ items: profesionales });
  } catch (e) {
    next(e);
  }
});
