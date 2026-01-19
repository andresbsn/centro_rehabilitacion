import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError, badRequest } from '../utils/httpError.js';
import { sendEmail } from '../utils/mailer.js';
import { registrarAuditoria, getClientIp } from '../services/auditoria.js';
import { parseUtcDateOnly, addDays, parseTimeToMinutes, minutesToTimeStr } from '../utils/date.js';
import {
  estadoToDb,
  estadoFromDb,
  serializeTurno,
  TURNO_INCLUDE,
  getOrCreateCosegurosConfig,
  resolveImporteCoseguroForPacienteId,
  resolveImporteCoseguroForTurno,
  getYearMonth,
  monthStartUtc,
  addMonthsUtc,
  ensurePagoMensualGimnasio,
  isKinesiologiaEspecialidad,
  isGimnasioEspecialidad
} from '../services/turnos.service.js';

export const turnosRouter = Router();

turnosRouter.use(requireAuth);

const turnoCreateSchema = z.object({
  pacienteId: z.string().min(1),
  especialidadId: z.string().min(1),
  profesionalId: z.string().min(1).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  notas: z.string().optional()
});

const turnoUpdateSchema = z.object({
  estado: z.enum(['pendiente', 'confirmado', 'cancelado', 'realizado']).optional(),
  notas: z.string().optional()
});

const turnoMasivoSchema = z
  .object({
    pacienteId: z.string().min(1),
    especialidadId: z.string().min(1),
    profesionalId: z.string().min(1).optional().nullable(),
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horaDesde: z.string().regex(/^\d{2}:\d{2}$/),
    horaHasta: z.string().regex(/^\d{2}:\d{2}$/),
    diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
    estado: z.enum(['pendiente', 'confirmado']).optional(),
    notas: z.string().optional().nullable(),
    importeMensualGimnasio: z.number().int().min(0).optional().nullable(),
    numeroOrden: z.number().int().min(1).optional().nullable(),
    cantidadSesiones: z.number().int().min(1).optional().nullable()
  })
  .refine((v) => v.desde <= v.hasta, { message: 'Rango de fechas inválido' })
  .refine((v) => v.horaDesde < v.horaHasta, { message: 'Rango horario inválido' });

// Funciones helper locales (solo las que no están en servicios)

async function buildMasivoPreview({ pacienteId, especialidadId, profesionalId, desde, hasta, horaDesde, horaHasta, diasSemana, estado, notas, numeroOrden, cantidadSesiones }) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) throw badRequest('Paciente no encontrado', 'NOT_FOUND');
  if (!paciente.activo) throw badRequest('El paciente no está activo', 'PACIENTE_INACTIVE');

  const especialidad = await prisma.especialidad.findUnique({ where: { id: especialidadId } });
  if (!especialidad) throw badRequest('Especialidad no encontrada', 'NOT_FOUND');
  if (!especialidad.activa) throw badRequest('La especialidad no está activa', 'ESPECIALIDAD_INACTIVE');

  const nombreEspecialidad = String(especialidad?.nombre || '').trim().toLowerCase();
  const isKinesiologia = nombreEspecialidad === 'kinesiologia';
  if (isKinesiologia) {
    const ord = Number(numeroOrden || 0);
    const cant = Number(cantidadSesiones || 0);
    if (!ord || ord <= 0) throw badRequest('Número de orden requerido', 'KINESIOLOGIA_ORDEN_REQUIRED');
    if (!cant || cant <= 0) throw badRequest('Cantidad de sesiones requerida', 'KINESIOLOGIA_SESIONES_REQUIRED');
  }

  if (profesionalId) {
    const profesional = await prisma.user.findUnique({ where: { id: profesionalId } });
    if (!profesional) throw badRequest('Profesional no encontrado', 'NOT_FOUND');
  }

  const startDate = parseUtcDateOnly(desde);
  const endDate = parseUtcDateOnly(hasta);

  const minStart = new Date(`${desde}T${horaDesde}:00.000Z`);
  const maxEnd = new Date(`${hasta}T${horaHasta}:00.000Z`);

  const existing = await prisma.turno.findMany({
    where: {
      especialidadId,
      profesionalId: profesionalId || null,
      estado: { not: 'CANCELADO' },
      startAt: { lt: maxEnd },
      endAt: { gt: minStart }
    },
    select: { id: true, startAt: true, endAt: true }
  });

  const durMin = especialidad.duracionTurnoMin;
  const horaDesdeMin = parseTimeToMinutes(horaDesde);
  const horaHastaMin = parseTimeToMinutes(horaHasta);

  const items = [];
  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getUTCDay();
    if (diasSemana.includes(dow)) {
      for (let t = horaDesdeMin; t + durMin <= horaHastaMin; t += durMin) {
        const startAt = new Date(`${getFechaStr(cursor)}T${minutesToTimeStr(t)}:00.000Z`);
        const endAt = new Date(startAt);
        endAt.setUTCMinutes(endAt.getUTCMinutes() + durMin);

        const conflict = !isKinesiologia && existing.some((e) => e.startAt < endAt && e.endAt > startAt);

        items.push({
          pacienteId,
          especialidadId,
          profesionalId: profesionalId || null,
          startAt,
          endAt,
          estado: estadoToDb(estado || 'pendiente') || 'RESERVADO',
          notas: notas || null,
          conflict
        });
      }
    }
    cursor = addDays(cursor, 1);
  }

  let filtered = items;
  if (isKinesiologia) {
    const cant = Number(cantidadSesiones || 0);
    filtered = items.filter((i) => !i.conflict).slice(0, cant);
  }

  const summary = {
    total: items.length,
    conflicts: items.filter((i) => i.conflict).length,
    creatable: items.filter((i) => !i.conflict).length,
    selectedForCreation: filtered.length
  };

  return {
    paciente: { id: paciente.id, nombre: paciente.nombre, apellido: paciente.apellido, email: paciente.email },
    especialidad: { id: especialidad.id, nombre: especialidad.nombre, duracionTurnoMin: especialidad.duracionTurnoMin },
    items: filtered.map((i) => ({
      ...serializeTurno({
        id: 'preview',
        pacienteId: i.pacienteId,
        especialidadId: i.especialidadId,
        profesionalId: i.profesionalId,
        startAt: i.startAt,
        endAt: i.endAt,
        estado: i.estado,
        notas: i.notas
      }),
      conflict: i.conflict
    })),
    summary
  };
}

function turnoEmailContext(turno) {
  const clinicName = process.env.CLINIC_NAME || 'Centro de Rehabilitacion';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const pacienteNombre = turno?.paciente ? `${turno.paciente.apellido}, ${turno.paciente.nombre}` : 'Paciente';
  const especialidadNombre = turno?.especialidad?.nombre || 'Especialidad';
  const profesionalNombre = turno?.profesional?.nombre || null;

  const fecha = turno?.fecha;
  const horaInicio = turno?.horaInicio;
  const horaFin = turno?.horaFin;
  const estado = turno?.estado;

  const detalleUrl = `${frontendUrl}/agenda`;

  const baseText = [
    `${clinicName}`,
    '',
    `Paciente: ${pacienteNombre}`,
    `Especialidad: ${especialidadNombre}`,
    profesionalNombre ? `Profesional: ${profesionalNombre}` : null,
    `Fecha: ${fecha}`,
    `Horario: ${horaInicio} - ${horaFin}`,
    `Estado: ${estado}`,
    '',
    `Ver agenda: ${detalleUrl}`
  ]
    .filter(Boolean)
    .join('\n');

  return {
    clinicName,
    frontendUrl,
    pacienteNombre,
    especialidadNombre,
    profesionalNombre,
    detalleUrl,
    baseText
  };
}

async function notifyTurnoCreated(turno) {
  const ctx = turnoEmailContext(turno);
  const recipients = [turno?.paciente?.email, turno?.profesional?.email].filter(Boolean);

  await sendEmail({
    to: recipients,
    subject: `[${ctx.clinicName}] Turno creado - ${ctx.pacienteNombre} - ${ctx.especialidadNombre}`,
    text: `${ctx.baseText}\n\nSe registró un nuevo turno.`
  });
}

async function notifyTurnoUpdated(turno, prevEstado) {
  const ctx = turnoEmailContext(turno);
  const recipients = [turno?.paciente?.email, turno?.profesional?.email].filter(Boolean);

  const extra = prevEstado && prevEstado !== turno.estado ? `Cambio de estado: ${prevEstado} -> ${turno.estado}` : 'Turno actualizado';

  await sendEmail({
    to: recipients,
    subject: `[${ctx.clinicName}] Turno actualizado - ${ctx.pacienteNombre} - ${ctx.especialidadNombre}`,
    text: `${ctx.baseText}\n\n${extra}`
  });
}

turnosRouter.get('/', async (req, res, next) => {
  try {
    const { desde, hasta, pacienteId, especialidadId, profesionalId, estado } = req.query;
    const where = {};

    if (desde || hasta) {
      where.startAt = {};
      if (desde) where.startAt.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) where.startAt.lte = new Date(`${hasta}T23:59:59.999Z`);
    }
    if (pacienteId) where.pacienteId = pacienteId;
    if (especialidadId) where.especialidadId = especialidadId;
    if (profesionalId) where.profesionalId = profesionalId;
    if (estado) where.estado = estadoToDb(String(estado));

    const items = await prisma.turno.findMany({
      where,
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        ordenKinesiologia: { select: { id: true, numero: true, cantidadSesiones: true } },
        profesional: { select: { id: true, nombre: true, email: true } }
      },
      orderBy: [{ startAt: 'asc' }],
      take: 500
    });

    res.json({ items: items.map(serializeTurno) });
  } catch (e) {
    next(e);
  }
});

turnosRouter.post('/masivo/preview', validateBody(turnoMasivoSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const preview = await buildMasivoPreview(data);
    res.json(preview);
  } catch (e) {
    next(e);
  }
});

turnosRouter.post('/masivo/confirm', validateBody(turnoMasivoSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const preview = await buildMasivoPreview(data);
    const creatable = preview.items.filter((i) => !i.conflict);

    const isGimnasio = String(preview?.especialidad?.nombre || '').trim().toLowerCase() === 'gimnasio';
    const isKinesiologia = String(preview?.especialidad?.nombre || '').trim().toLowerCase() === 'kinesiologia';
    if (isGimnasio) {
      const importe = Number(data.importeMensualGimnasio || 0);
      if (!importe || importe <= 0) return next(badRequest('Importe mensual de gimnasio requerido', 'GIMNASIO_IMPORTE_REQUIRED'));
    }

    if (isKinesiologia) {
      const ord = Number(data.numeroOrden || 0);
      const cant = Number(data.cantidadSesiones || 0);
      if (!ord || ord <= 0) return next(badRequest('Número de orden requerido', 'KINESIOLOGIA_ORDEN_REQUIRED'));
      if (!cant || cant <= 0) return next(badRequest('Cantidad de sesiones requerida', 'KINESIOLOGIA_SESIONES_REQUIRED'));

      if (creatable.length < cant) {
        return next(
          badRequest(
            `No hay suficientes turnos disponibles en el calendario para crear ${cant} sesiones (disponibles: ${creatable.length}). Ajustá el rango/días/horarios.`,
            'KINESIOLOGIA_NOT_ENOUGH_SLOTS'
          )
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      const importeCoseguro = await resolveImporteCoseguroForTurno({ pacienteId: data.pacienteId, especialidadId: data.especialidadId, tx });

      let ordenKinesiologia = null;
      if (isKinesiologia) {
        ordenKinesiologia = await tx.ordenKinesiologia.upsert({
          where: {
            pacienteId_numero: {
              pacienteId: data.pacienteId,
              numero: Number(data.numeroOrden)
            }
          },
          create: {
            pacienteId: data.pacienteId,
            numero: Number(data.numeroOrden),
            cantidadSesiones: Number(data.cantidadSesiones)
          },
          update: {
            cantidadSesiones: Number(data.cantidadSesiones)
          }
        });
      }

      if (isGimnasio) {
        const start = parseUtcDateOnly(data.desde);
        const end = parseUtcDateOnly(data.hasta);
        const first = monthStartUtc(start.getUTCFullYear(), start.getUTCMonth());
        const last = monthStartUtc(end.getUTCFullYear(), end.getUTCMonth());

        let cursor = new Date(first);
        while (cursor <= last) {
          const ym = getYearMonth(cursor);
          await ensurePagoMensualGimnasio({
            pacienteId: data.pacienteId,
            yearMonth: ym,
            importe: Number(data.importeMensualGimnasio || 0),
            tx
          });
          cursor = addMonthsUtc(cursor, 1);
        }
      }

      const kinesiologiaLimit = isKinesiologia ? Number(data.cantidadSesiones || 0) : null;
      const toCreate = isKinesiologia ? creatable.slice(0, kinesiologiaLimit) : creatable;

      let sesionNro = 0;
      for (const i of toCreate) {
        sesionNro += 1;
        const turno = await tx.turno.create({
          data: {
            pacienteId: data.pacienteId,
            especialidadId: data.especialidadId,
            profesionalId: data.profesionalId || null,
            startAt: new Date(`${i.fecha}T${i.horaInicio}:00.000Z`),
            endAt: new Date(`${i.fecha}T${i.horaFin}:00.000Z`),
            estado: estadoToDb(data.estado || 'pendiente') || 'RESERVADO',
            notas: data.notas || null,
            importeCoseguro,
            ...(ordenKinesiologia ? { ordenKinesiologiaId: ordenKinesiologia.id, sesionNro } : {})
          },
          include: {
            paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
            especialidad: true,
            profesional: { select: { id: true, nombre: true, email: true } }
          }
        });
        rows.push(serializeTurno(turno));
      }
      return rows;
    });

    res.json({
      createdCount: created.length,
      skippedConflicts: preview.summary.conflicts,
      totalRequested: preview.summary.total,
      created
    });
  } catch (e) {
    next(e);
  }
});

turnosRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        ordenKinesiologia: { select: { id: true, numero: true, cantidadSesiones: true } },
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    if (!turno) return next(new HttpError(404, 'NOT_FOUND', 'Turno no encontrado'));

    res.json({ turno: serializeTurno(turno) });
  } catch (e) {
    next(e);
  }
});

turnosRouter.post('/', validateBody(turnoCreateSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const { pacienteId, especialidadId, profesionalId, fecha, horaInicio, notas } = data;

    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
    if (!paciente) return next(badRequest('Paciente no encontrado', 'NOT_FOUND'));
    if (!paciente.activo) return next(badRequest('El paciente no está activo', 'PACIENTE_INACTIVE'));

    const especialidad = await prisma.especialidad.findUnique({ where: { id: especialidadId } });
    if (!especialidad) return next(badRequest('Especialidad no encontrada', 'NOT_FOUND'));
    if (!especialidad.activa) return next(badRequest('La especialidad no está activa', 'ESPECIALIDAD_INACTIVE'));

    if (profesionalId) {
      const profesional = await prisma.user.findUnique({ where: { id: profesionalId } });
      if (!profesional) return next(badRequest('Profesional no encontrado', 'NOT_FOUND'));
    }

    const startAt = new Date(`${fecha}T${horaInicio}:00.000Z`);
    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + especialidad.duracionTurnoMin);

    if (!isKinesiologiaEspecialidad(especialidad)) {
      const overlapping = await prisma.turno.findFirst({
        where: {
          especialidadId,
          profesionalId: profesionalId || null,
          estado: { not: 'CANCELADO' },
          startAt: { lt: endAt },
          endAt: { gt: startAt }
        }
      });

      if (overlapping) {
        return next(badRequest('Ya existe un turno en ese horario para esta especialidad/profesional', 'OVERLAP'));
      }
    }

    const importeCoseguro = await resolveImporteCoseguroForTurno({ pacienteId, especialidadId });

    const turno = await prisma.turno.create({
      data: {
        pacienteId,
        especialidadId,
        profesionalId: profesionalId || null,
        startAt,
        endAt,
        estado: 'RESERVADO',
        notas: notas || null,
        importeCoseguro
      },
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    const dto = serializeTurno(turno);
    notifyTurnoCreated(dto).catch((err) => {
      console.error('[email] notifyTurnoCreated failed', err);
    });

    res.status(201).json({ turno: dto });
  } catch (e) {
    next(e);
  }
});

turnosRouter.put('/:id', validateBody(turnoUpdateSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const exists = await prisma.turno.findUnique({ where: { id } });
    if (!exists) return next(new HttpError(404, 'NOT_FOUND', 'Turno no encontrado'));
    const prevEstadoDb = exists.estado;
    const prevEstado = estadoFromDb(exists.estado);

    const nuevoEstadoDb = data.estado !== undefined ? estadoToDb(data.estado) : undefined;
    const cambioEstado = nuevoEstadoDb && nuevoEstadoDb !== prevEstadoDb;

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        ...(nuevoEstadoDb ? { estado: nuevoEstadoDb } : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {})
      },
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    if (cambioEstado && req.user?.id) {
      await prisma.turnoHistorial.create({
        data: {
          turnoId: id,
          estadoAnterior: prevEstadoDb,
          estadoNuevo: nuevoEstadoDb,
          usuarioId: req.user.id
        }
      });
    }

    const dto = serializeTurno(turno);
    notifyTurnoUpdated(dto, prevEstado).catch((err) => {
      console.error('[email] notifyTurnoUpdated failed', err);
    });

    res.json({ turno: dto });
  } catch (e) {
    next(e);
  }
});

turnosRouter.post('/:id/cobrar', requireRole(['admin', 'recepcion']), async (req, res, next) => {
  try {
    const id = req.params.id;
    const turno = await prisma.turno.findUnique({ where: { id } });
    if (!turno) return next(new HttpError(404, 'NOT_FOUND', 'Turno no encontrado'));
    if (turno.cobrado) return next(badRequest('El turno ya está cobrado', 'ALREADY_PAID'));

    const updated = await prisma.turno.update({
      where: { id },
      data: {
        cobrado: true,
        cobradoAt: new Date(),
        cobradoPorId: req.user.id
      },
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    registrarAuditoria({
      accion: 'COBRAR',
      entidad: 'Turno',
      entidadId: id,
      usuarioId: req.user?.id,
      datos: { importe: updated.importeCoseguro },
      ip: getClientIp(req)
    });

    res.json({ turno: serializeTurno(updated) });
  } catch (e) {
    next(e);
  }
});

turnosRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    const turno = await prisma.turno.findUnique({ where: { id } });
    if (!turno) return next(new HttpError(404, 'NOT_FOUND', 'Turno no encontrado'));

    const prevEstadoDb = turno.estado;

    const updated = await prisma.turno.update({
      where: { id },
      data: { estado: 'CANCELADO' },
      include: {
        paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
        especialidad: true,
        profesional: { select: { id: true, nombre: true, email: true } }
      }
    });

    if (prevEstadoDb !== 'CANCELADO' && req.user?.id) {
      await prisma.turnoHistorial.create({
        data: {
          turnoId: id,
          estadoAnterior: prevEstadoDb,
          estadoNuevo: 'CANCELADO',
          usuarioId: req.user.id
        }
      });
    }

    registrarAuditoria({
      accion: 'CANCELAR',
      entidad: 'Turno',
      entidadId: id,
      usuarioId: req.user?.id,
      datos: { pacienteId: turno.pacienteId },
      ip: getClientIp(req)
    });

    const dto = serializeTurno(updated);
    notifyTurnoUpdated(dto, estadoFromDb(turno.estado)).catch((err) => {
      console.error('[email] notifyTurnoCancel failed', err);
    });

    res.json({ turno: dto });
  } catch (e) {
    next(e);
  }
});
