import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { unauthorized, forbidden } from '../utils/httpError.js';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return next(unauthorized());

    const token = auth.slice('Bearer '.length);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });

    if (!user) return next(unauthorized());

    req.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role.name
    };

    next();
  } catch (e) {
    return next(unauthorized());
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
