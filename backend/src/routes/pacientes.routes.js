import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';

export const pacientesRouter = Router();

pacientesRouter.use(requireAuth);

const obraSocialInputSchema = z
  .object({
    obraSocialId: z.string().min(1).optional(),
    nuevaObraSocial: z
      .object({
        nombre: z.string().min(1),
        plan: z.string().min(1).optional(),
        observaciones: z.string().min(1).optional()
      })
      .optional(),
    numeroAfiliado: z.string().min(1),
    observaciones: z.string().min(1).optional()
  })
  .refine((v) => Boolean(v.obraSocialId) !== Boolean(v.nuevaObraSocial), {
    message: 'Debe indicar obraSocialId o nuevaObraSocial (uno solo)'
  });

const pacienteBaseSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  dni: z.string().min(1),
  fechaNacimiento: z.coerce.date(),
  telefono: z.string().min(1),
  email: z.string().email().optional().nullable(),
  direccion: z.string().min(1),
  contactoEmergencia: z.string().min(1),
  activo: z.boolean().optional(),
  obraSocial: obraSocialInputSchema.optional().nullable()
});

const pacienteCreateSchema = pacienteBaseSchema;

const pacienteUpdateSchema = pacienteBaseSchema.partial().extend({
  fechaNacimiento: z.coerce.date().optional()
});

const seguimientoTipoValues = ['KINESIOLOGIA', 'GIMNASIO', 'GENERAL', 'OTRO'];

const seguimientoCreateSchema = z.object({
  tipo: z.enum(seguimientoTipoValues),
  texto: z.string().min(1)
});

const seguimientoUpdateSchema = z.object({
  tipo: z.enum(seguimientoTipoValues).optional(),
  texto: z.string().min(1).optional()
});

function parsePagination(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 20;

  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize, take: safePageSize };
}

function buildSearchWhere(query) {
  const search = query.search ? String(query.search).trim() : '';
  const apellido = query.apellido ? String(query.apellido).trim() : '';
  const dni = query.dni ? String(query.dni).trim() : '';
  const telefono = query.telefono ? String(query.telefono).trim() : '';

  const and = [];

  if (query.activo !== undefined) {
    const activo = String(query.activo).toLowerCase();
    if (activo === 'true' || activo === 'false') {
      and.push({ activo: activo === 'true' });
    }
  }

  if (apellido) and.push({ apellido: { contains: apellido, mode: 'insensitive' } });
  if (dni) and.push({ dni: { contains: dni, mode: 'insensitive' } });
  if (telefono) and.push({ telefono: { contains: telefono, mode: 'insensitive' } });

  if (search) {
    and.push({
      OR: [
        { apellido: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } }
      ]
    });
  }

  return and.length ? { AND: and } : {};
}

pacientesRouter.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query);
    const where = buildSearchWhere(req.query);

    const [total, items] = await Promise.all([
      prisma.paciente.count({ where }),
      prisma.paciente.findMany({
        where,
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip,
        take,
        include: {
          obraSocial: {
            include: { obraSocial: true }
          }
        }
      })
    ]);

    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

pacientesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        obraSocial: { include: { obraSocial: true } }
      }
    });

    if (!paciente) return next(new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado'));

    res.json({ paciente });
  } catch (e) {
    next(e);
  }
});

pacientesRouter.get('/:id/seguimientos', async (req, res, next) => {
  try {
    const id = req.params.id;
    const paciente = await prisma.paciente.findUnique({ where: { id }, select: { id: true } });
    if (!paciente) return next(new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado'));

    const search = req.query.search ? String(req.query.search).trim() : '';
    const tipo = req.query.tipo ? String(req.query.tipo).trim().toUpperCase() : '';

    const and = [{ pacienteId: id }];
    if (search) and.push({ texto: { contains: search, mode: 'insensitive' } });
    if (tipo && seguimientoTipoValues.includes(tipo)) and.push({ tipo });

    const where = { AND: and };

    const items = await prisma.seguimiento.findMany({
      where,
      include: {
        profesional: { select: { id: true, nombre: true, email: true } }
      },
      orderBy: [{ fecha: 'desc' }],
      take: 200
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

pacientesRouter.get('/:id/ordenes-kinesiologia', requireRole(['admin', 'recepcion']), async (req, res, next) => {
  try {
    const id = req.params.id;
    const paciente = await prisma.paciente.findUnique({ where: { id }, select: { id: true } });
    if (!paciente) return next(new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado'));

    const ordenes = await prisma.ordenKinesiologia.findMany({
      where: { pacienteId: id },
      orderBy: [{ numero: 'desc' }],
      include: {
        turnos: {
          include: {
            especialidad: true,
            profesional: { select: { id: true, nombre: true, email: true } }
          },
          orderBy: [{ startAt: 'asc' }]
        }
      }
    });

    const items = ordenes.map((o) => {
      const consumidas = (o.turnos || []).filter((t) => t.estado === 'ASISTIO').length;
      const pendientes = Math.max(0, Number(o.cantidadSesiones || 0) - consumidas);
      return {
        id: o.id,
        pacienteId: o.pacienteId,
        numero: o.numero,
        cantidadSesiones: o.cantidadSesiones,
        consumidas,
        pendientes,
        createdAt: o.createdAt,
        turnos: (o.turnos || []).map((t) => ({
          ...t,
          fecha: new Date(t.startAt).toISOString().slice(0, 10),
          horaInicio: new Date(t.startAt).toISOString().slice(11, 16),
          horaFin: new Date(t.endAt).toISOString().slice(11, 16)
        }))
      };
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

pacientesRouter.post(
  '/:id/seguimientos',
  requireRole(['admin', 'recepcion', 'profesional']),
  validateBody(seguimientoCreateSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const paciente = await prisma.paciente.findUnique({ where: { id } });
      if (!paciente) return next(new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado'));

      const seguimiento = await prisma.seguimiento.create({
        data: {
          pacienteId: id,
          profesionalId: req.user.id,
          tipo: data.tipo,
          texto: data.texto
        },
        include: {
          profesional: { select: { id: true, nombre: true, email: true } }
        }
      });

      res.status(201).json({ seguimiento });
    } catch (e) {
      next(e);
    }
  }
);

pacientesRouter.put(
  '/:id/seguimientos/:seguimientoId',
  requireRole(['admin', 'recepcion', 'profesional']),
  validateBody(seguimientoUpdateSchema),
  async (req, res, next) => {
    try {
      const { id, seguimientoId } = req.params;
      const data = req.body;

      const seguimiento = await prisma.seguimiento.findUnique({
        where: { id: seguimientoId },
        include: { profesional: { select: { id: true, nombre: true, email: true } } }
      });
      if (!seguimiento || seguimiento.pacienteId !== id) {
        return next(new HttpError(404, 'NOT_FOUND', 'Seguimiento no encontrado'));
      }

      if (req.user.role === 'profesional' && seguimiento.profesionalId !== req.user.id) {
        return next(new HttpError(403, 'FORBIDDEN', 'No puede modificar seguimientos de otro profesional'));
      }

      const updated = await prisma.seguimiento.update({
        where: { id: seguimientoId },
        data: {
          ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
          ...(data.texto !== undefined ? { texto: data.texto } : {})
        },
        include: { profesional: { select: { id: true, nombre: true, email: true } } }
      });

      res.json({ seguimiento: updated });
    } catch (e) {
      next(e);
    }
  }
);

pacientesRouter.delete(
  '/:id/seguimientos/:seguimientoId',
  requireRole(['admin', 'recepcion', 'profesional']),
  async (req, res, next) => {
    try {
      const { id, seguimientoId } = req.params;

      const seguimiento = await prisma.seguimiento.findUnique({ where: { id: seguimientoId } });
      if (!seguimiento || seguimiento.pacienteId !== id) {
        return next(new HttpError(404, 'NOT_FOUND', 'Seguimiento no encontrado'));
      }

      if (req.user.role === 'profesional' && seguimiento.profesionalId !== req.user.id) {
        return next(new HttpError(403, 'FORBIDDEN', 'No puede eliminar seguimientos de otro profesional'));
      }

      await prisma.seguimiento.delete({ where: { id: seguimientoId } });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

pacientesRouter.post('/', requireRole(['admin', 'recepcion']), validateBody(pacienteCreateSchema), async (req, res, next) => {
  try {
    const data = req.body;

    const created = await prisma.$transaction(async (tx) => {
      let obraSocialRelation = null;

      if (data.obraSocial) {
        let obraSocialId = data.obraSocial.obraSocialId;

        if (data.obraSocial.nuevaObraSocial) {
          const os = await tx.obraSocial.create({
            data: {
              nombre: data.obraSocial.nuevaObraSocial.nombre,
              plan: data.obraSocial.nuevaObraSocial.plan,
              observaciones: data.obraSocial.nuevaObraSocial.observaciones
            }
          });
          obraSocialId = os.id;
        }

        obraSocialRelation = {
          create: {
            obraSocialId,
            numeroAfiliado: data.obraSocial.numeroAfiliado,
            observaciones: data.obraSocial.observaciones
          }
        };
      }

      const paciente = await tx.paciente.create({
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          dni: data.dni,
          fechaNacimiento: data.fechaNacimiento,
          telefono: data.telefono,
          email: data.email || null,
          direccion: data.direccion,
          contactoEmergencia: data.contactoEmergencia,
          activo: data.activo ?? true,
          ...(obraSocialRelation ? { obraSocial: obraSocialRelation } : {})
        },
        include: {
          obraSocial: { include: { obraSocial: true } }
        }
      });

      return paciente;
    });

    res.status(201).json({ paciente: created });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('DNI o dato único duplicado', 'DUPLICATE'));
    }
    next(e);
  }
});

pacientesRouter.put('/:id', requireRole(['admin', 'recepcion']), validateBody(pacienteUpdateSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.paciente.findUnique({
        where: { id },
        include: { obraSocial: true }
      });

      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado');

      let obraSocialUpdate = undefined;

      if (data.obraSocial === null) {
        obraSocialUpdate = { delete: true };
      } else if (data.obraSocial) {
        let obraSocialId = data.obraSocial.obraSocialId;

        if (data.obraSocial.nuevaObraSocial) {
          const os = await tx.obraSocial.create({
            data: {
              nombre: data.obraSocial.nuevaObraSocial.nombre,
              plan: data.obraSocial.nuevaObraSocial.plan,
              observaciones: data.obraSocial.nuevaObraSocial.observaciones
            }
          });
          obraSocialId = os.id;
        }

        if (existing.obraSocial) {
          obraSocialUpdate = {
            update: {
              obraSocialId,
              numeroAfiliado: data.obraSocial.numeroAfiliado,
              observaciones: data.obraSocial.observaciones
            }
          };
        } else {
          obraSocialUpdate = {
            create: {
              obraSocialId,
              numeroAfiliado: data.obraSocial.numeroAfiliado,
              observaciones: data.obraSocial.observaciones
            }
          };
        }
      }

      const paciente = await tx.paciente.update({
        where: { id },
        data: {
          ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
          ...(data.apellido !== undefined ? { apellido: data.apellido } : {}),
          ...(data.dni !== undefined ? { dni: data.dni } : {}),
          ...(data.fechaNacimiento !== undefined ? { fechaNacimiento: data.fechaNacimiento } : {}),
          ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.direccion !== undefined ? { direccion: data.direccion } : {}),
          ...(data.contactoEmergencia !== undefined ? { contactoEmergencia: data.contactoEmergencia } : {}),
          ...(data.activo !== undefined ? { activo: data.activo } : {}),
          ...(obraSocialUpdate !== undefined ? { obraSocial: obraSocialUpdate } : {})
        },
        include: {
          obraSocial: { include: { obraSocial: true } }
        }
      });

      return paciente;
    });

    res.json({ paciente: updated });
  } catch (e) {
    if (e?.code === 'P2002') {
      return next(badRequest('DNI o dato único duplicado', 'DUPLICATE'));
    }
    next(e);
  }
});

pacientesRouter.delete('/:id', requireRole(['admin', 'recepcion']), async (req, res, next) => {
  try {
    const id = req.params.id;

    const paciente = await prisma.paciente.findUnique({ where: { id } });
    if (!paciente) return next(new HttpError(404, 'NOT_FOUND', 'Paciente no encontrado'));

    const updated = await prisma.paciente.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ paciente: updated });
  } catch (e) {
    next(e);
  }
});
