/**
 * Utilidades de fecha compartidas
 */

export function toIsoString(date) {
  return new Date(date).toISOString();
}

export function toDateOnlyStr(date) {
  return toIsoString(date).slice(0, 10);
}

export function toTimeStr(date) {
  return toIsoString(date).slice(11, 16);
}

export function parseUtcDateOnly(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeStr(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getStartOfDay(date = new Date()) {
  const dateStr = toDateOnlyStr(date);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function getEndOfDay(date = new Date()) {
  const dateStr = toDateOnlyStr(date);
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export function getStartOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function getEndOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function buildDateRangeFilter(desde, hasta, field = 'startAt') {
  const desdeDate = parseUtcDateOnly(desde);
  const hastaDate = parseUtcDateOnly(hasta);

  if (!desdeDate && !hastaDate) return {};

  const filter = { [field]: {} };
  if (desdeDate) filter[field].gte = desdeDate;
  if (hastaDate) {
    const end = addDays(hastaDate, 1);
    filter[field].lt = end;
  }

  return filter;
}
