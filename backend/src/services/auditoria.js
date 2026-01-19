import { prisma } from '../prisma.js';

export async function registrarAuditoria({ accion, entidad, entidadId, usuarioId, datos, ip }) {
  try {
    await prisma.auditoria.create({
      data: {
        accion,
        entidad,
        entidadId: entidadId ? String(entidadId) : null,
        usuarioId: usuarioId || null,
        datos: datos || null,
        ip: ip || null
      }
    });
  } catch (err) {
    console.error('[Auditoria] Error al registrar:', err.message);
  }
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}
