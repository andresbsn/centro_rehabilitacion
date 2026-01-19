/**
 * Servicio de turnos - Lógica de negocio centralizada
 */

import { prisma } from '../prisma.js';
import { toDateOnlyStr, toTimeStr } from '../utils/date.js';

// Mapeo de estados frontend <-> DB
const ESTADO_TO_DB = {
  pendiente: 'RESERVADO',
  confirmado: 'CONFIRMADO',
  realizado: 'ASISTIO',
  cancelado: 'CANCELADO'
};

const ESTADO_FROM_DB = {
  RESERVADO: 'pendiente',
  CONFIRMADO: 'confirmado',
  ASISTIO: 'realizado',
  CANCELADO: 'cancelado',
  AUSENTE: 'cancelado'
};

export function estadoToDb(estado) {
  if (!estado) return undefined;
  return ESTADO_TO_DB[estado] || undefined;
}

export function estadoFromDb(estado) {
  if (!estado) return 'pendiente';
  return ESTADO_FROM_DB[estado] || 'pendiente';
}

export function serializeTurno(turno) {
  if (!turno) return turno;
  return {
    ...turno,
    fecha: toDateOnlyStr(turno.startAt),
    horaInicio: toTimeStr(turno.startAt),
    horaFin: toTimeStr(turno.endAt),
    estado: estadoFromDb(turno.estado)
  };
}

export function serializeTurnos(turnos) {
  return turnos.map(serializeTurno);
}

// Includes estándar para queries de turnos
export const TURNO_INCLUDE = {
  paciente: { include: { obraSocial: { include: { obraSocial: true } } } },
  especialidad: true,
  profesional: { select: { id: true, nombre: true, email: true } },
  ordenKinesiologia: true
};

export const TURNO_INCLUDE_SIMPLE = {
  paciente: { select: { id: true, nombre: true, apellido: true } },
  especialidad: { select: { id: true, nombre: true } },
  profesional: { select: { id: true, nombre: true } }
};

// Configuración de coseguros
export async function getOrCreateCosegurosConfig(tx) {
  const client = tx || prisma;
  return client.configuracionCoseguros.upsert({
    where: { id: 'default' },
    create: { id: 'default', coseguro1: 0, coseguro2: 0 },
    update: {}
  });
}

export async function resolveImporteCoseguroForPacienteId(pacienteId, tx) {
  const client = tx || prisma;
  const paciente = await client.paciente.findUnique({
    where: { id: pacienteId },
    include: {
      obraSocial: {
        include: { obraSocial: true }
      }
    }
  });

  const tipo = paciente?.obraSocial?.obraSocial?.coseguroTipo;
  if (!tipo) return 0;

  const config = await getOrCreateCosegurosConfig(client);
  return tipo === 'COSEGURO1' ? config.coseguro1 : config.coseguro2;
}

export async function resolveImporteCoseguroForTurno({ pacienteId, especialidadId, tx }) {
  const client = tx || prisma;
  const especialidad = await client.especialidad.findUnique({ where: { id: especialidadId } });
  const nombre = String(especialidad?.nombre || '').trim().toLowerCase();
  
  // Gimnasio no tiene coseguro
  if (nombre === 'gimnasio') return 0;
  
  return resolveImporteCoseguroForPacienteId(pacienteId, client);
}

// Utilidades de año/mes para pagos gimnasio
export function getYearMonth(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthStartUtc(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

export function addMonthsUtc(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

// Gestión de pagos mensuales de gimnasio
export async function ensurePagoMensualGimnasio({ pacienteId, yearMonth, importe, tx }) {
  const client = tx || prisma;
  const existing = await client.pagoMensualGimnasio.findUnique({
    where: {
      pacienteId_yearMonth: { pacienteId, yearMonth }
    }
  });

  if (!existing) {
    return client.pagoMensualGimnasio.create({
      data: {
        pacienteId,
        yearMonth,
        importe: Number(importe || 0)
      }
    });
  }

  if (existing.cobrado) return existing;

  return client.pagoMensualGimnasio.update({
    where: { id: existing.id },
    data: { importe: Number(importe || 0) }
  });
}

// Verificar si una especialidad es kinesiología
export function isKinesiologiaEspecialidad(especialidad) {
  const nombre = String(especialidad?.nombre || '').trim().toLowerCase();
  return nombre === 'kinesiologia';
}

// Verificar si una especialidad es gimnasio
export function isGimnasioEspecialidad(especialidad) {
  const nombre = String(especialidad?.nombre || '').trim().toLowerCase();
  return nombre === 'gimnasio';
}
