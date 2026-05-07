/** Utilidades para leer archivos Excel en el cliente (SheetJS). */

export async function parseExcelFirstSheet(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const data = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
}

/** Normaliza claves de cabecera: minúsculas, sin acentos, espacios → _. */
export function normalizeExcelKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function normalizeExcelRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeExcelKey(k)] = v;
  }
  return out;
}

export function isEmptyDataRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v == null || String(v).trim() === '');
}

/** Normaliza texto para comparar nombres de catálogo (área, temporal, líder). */
export function normalizeLookupKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cellStr(v: unknown): string {
  if (v == null || v === '') {
    return '';
  }
  return String(v).trim();
}

export function cellOptInt(v: unknown): number | null {
  const s = cellStr(v);
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** active | inactive (catálogos) o active | inactive | pending (empleados). */
export function cellStatus(
  v: unknown,
  allowed: readonly string[],
  defaultStatus: string,
): string {
  const s = cellStr(v).toLowerCase();
  if (!s) {
    return defaultStatus;
  }
  if (allowed.includes(s)) {
    return s;
  }
  throw new Error(`estado inválido: use ${allowed.join(', ')}`);
}
