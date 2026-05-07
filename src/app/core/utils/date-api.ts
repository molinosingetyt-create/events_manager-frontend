/** Fechas en hora local (sin UTC) para formularios y API `YYYY-MM-DD`. */

export function localMidnight(y: number, monthIndex: number, day: number): Date {
  return new Date(y, monthIndex, day);
}

export function todayLocal(): Date {
  const n = new Date();
  return localMidnight(n.getFullYear(), n.getMonth(), n.getDate());
}

export function dateToYmd(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ymdToDate(ymd: string | null | undefined): Date | null {
  if (!ymd?.trim()) {
    return null;
  }
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [y, m, d] = parts;
  return localMidnight(y, m - 1, d);
}

/** Útil para abrir el calendario en el mes adecuado (hoy o el mínimo permitido). */
export function maxLocalDate(a: Date, b: Date): Date {
  const ta = a.getTime();
  const tb = b.getTime();
  return ta >= tb ? a : b;
}
