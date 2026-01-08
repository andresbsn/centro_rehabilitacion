import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { validateBody } from '../middleware/validate.js';
import { badRequest, unauthorized } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) return next(unauthorized('Credenciales inválidas'));

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return next(unauthorized('Credenciales inválidas'));

    if (!process.env.JWT_SECRET) return next(badRequest('JWT_SECRET no configurado'));

    const token = jwt.sign(
      { role: user.role.name },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role.name
      }
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});
