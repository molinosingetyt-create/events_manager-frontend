import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import {
  cellOptInt,
  cellStr,
  isEmptyDataRow,
  normalizeExcelRow,
  normalizeLookupKey,
  parseExcelFirstSheet,
} from './excel-parse';

interface IdNameRow {
  id: number;
  name: string;
  status?: string;
}

function isActiveRow(r: IdNameRow): boolean {
  return r.status == null || r.status === 'active';
}

/** Mapa nombre normalizado → id; falla si hay colisiones entre activos. */
function buildNameToIdMap(items: IdNameRow[], entityLabel: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    if (!isActiveRow(it)) {
      continue;
    }
    const k = normalizeLookupKey(it.name);
    if (!k) {
      continue;
    }
    if (m.has(k)) {
      throw new Error(
        `${entityLabel}: hay nombres equivalentes al normalizar (p. ej. «${it.name}»). Unifique en el sistema o use id numérico.`,
      );
    }
    m.set(k, it.id);
  }
  return m;
}

function resolveCatalogByIdOrName(
  raw: unknown,
  fieldLabel: string,
  activeItems: IdNameRow[],
  byName: Map<string, number>,
): number {
  const s = cellStr(raw);
  if (!s) {
    throw new Error(`${fieldLabel} es obligatorio`);
  }
  const byId = new Map(activeItems.filter(isActiveRow).map((x) => [x.id, x] as const));
  const trimmed = s.trim();
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    if (byId.has(id)) {
      return id;
    }
  }
  const k = normalizeLookupKey(s);
  const id = byName.get(k);
  if (id == null) {
    throw new Error(
      `${fieldLabel} no reconocido: «${s}». Indique el nombre tal como está en el sistema o el id numérico.`,
    );
  }
  return id;
}

function resolveLeaderId(
  raw: unknown,
  activeLeaders: IdNameRow[],
  leaderByName: Map<string, number>,
): number | null {
  const s = cellStr(raw);
  if (!s) {
    return null;
  }
  const byId = new Map(activeLeaders.map((x) => [x.id, x] as const));
  const trimmed = s.trim();
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    if (byId.has(id)) {
      return id;
    }
  }
  const k = normalizeLookupKey(s);
  const id = leaderByName.get(k);
  if (id == null) {
    throw new Error(
      `Líder no reconocido: «${s}». Use el nombre completo del usuario líder o su id numérico (opcional).`,
    );
  }
  return id;
}

interface UserAreaRow extends IdNameRow {
  area_id: number;
  role?: string;
}

/**
 * Si `allUsers` está definido (solo admin en import): resuelve líder entre todos los usuarios
 * activos (sin exigir que coincida el área del empleado). Los ids numéricos se envían tal cual
 * para que el backend valide.
 */
function resolveLeaderForEmployeeRow(
  raw: unknown,
  _areaId: number,
  activeLeaders: IdNameRow[],
  leaderByName: Map<string, number>,
  allUsers: UserAreaRow[] | null,
): number | null {
  if (allUsers != null) {
    const s = cellStr(raw);
    if (!s) {
      return null;
    }
    const activeUsers = allUsers.filter(isActiveRow);
    const trimmed = s.trim();
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    const k = normalizeLookupKey(s);
    const matches = activeUsers.filter((u) => normalizeLookupKey(u.name) === k);
    if (matches.length === 1) {
      return matches[0].id;
    }
    if (matches.length > 1) {
      throw new Error(
        `Varios usuarios activos coinciden con «${s}». Use el id numérico o un nombre más específico.`,
      );
    }
    throw new Error(
      `Usuario no reconocido: «${s}». Use el id numérico o el nombre tal como está en el sistema.`,
    );
  }
  return resolveLeaderId(raw, activeLeaders, leaderByName);
}

export interface ImportSummary {
  created: number;
  skipped: number;
  errors: string[];
}

function httpErr(err: unknown): string {
  const e = err as { error?: { detail?: unknown } };
  const d = e?.error?.detail;
  if (typeof d === 'string') {
    return d;
  }
  if (Array.isArray(d)) {
    return d.map((x: { msg?: string }) => x?.msg ?? String(x)).join('; ');
  }
  return 'Error al guardar';
}

export async function importDiagnosesExcel(api: ApiService, file: File): Promise<ImportSummary> {
  const raw = await parseExcelFirstSheet(file);
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeExcelRow(raw[i]);
    if (isEmptyDataRow(row)) {
      skipped++;
      continue;
    }
    const excelRow = i + 2;
    try {
      const codigo = cellStr(row['codigo']);
      const nombre = cellStr(row['nombre']);
      if (!codigo || !nombre) {
        throw new Error('codigo y nombre son obligatorios');
      }
      const descripcion = cellStr(row['descripcion']) || null;
      await firstValueFrom(
        api.post('/diagnoses', {
          code: codigo,
          name: nombre,
          description: descripcion,
          status: 'active',
        }),
      );
      created++;
    } catch (e) {
      errors.push(`Fila ${excelRow}: ${e instanceof Error ? e.message : httpErr(e)}`);
    }
  }
  return { created, skipped, errors };
}

export async function importEpsArlExcel(api: ApiService, file: File): Promise<ImportSummary> {
  const raw = await parseExcelFirstSheet(file);
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  const kinds = ['eps', 'arl'];

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeExcelRow(raw[i]);
    if (isEmptyDataRow(row)) {
      skipped++;
      continue;
    }
    const excelRow = i + 2;
    try {
      const tipo = cellStr(row['tipo']).toLowerCase();
      const nombre = cellStr(row['nombre']);
      if (!tipo || !nombre) {
        throw new Error('tipo y nombre son obligatorios');
      }
      if (!kinds.includes(tipo)) {
        throw new Error('tipo debe ser eps o arl');
      }
      const codigoRaw = cellStr(row['codigo']);
      const codigo = codigoRaw && codigoRaw.toUpperCase() !== 'OPCIONAL' ? codigoRaw : null;
      await firstValueFrom(
        api.post('/eps-arl', {
          kind: tipo,
          name: nombre,
          code: codigo,
          status: 'active',
        }),
      );
      created++;
    } catch (e) {
      errors.push(`Fila ${excelRow}: ${e instanceof Error ? e.message : httpErr(e)}`);
    }
  }
  return { created, skipped, errors };
}

export async function importTemporalExcel(api: ApiService, file: File): Promise<ImportSummary> {
  const raw = await parseExcelFirstSheet(file);
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeExcelRow(raw[i]);
    if (isEmptyDataRow(row)) {
      skipped++;
      continue;
    }
    const excelRow = i + 2;
    try {
      const nombre = cellStr(row['nombre']);
      if (!nombre) {
        throw new Error('nombre es obligatorio');
      }
      await firstValueFrom(api.post('/temporal-categories', { name: nombre, status: 'active' }));
      created++;
    } catch (e) {
      errors.push(`Fila ${excelRow}: ${e instanceof Error ? e.message : httpErr(e)}`);
    }
  }
  return { created, skipped, errors };
}

export async function importAreasExcel(api: ApiService, file: File): Promise<ImportSummary> {
  const raw = await parseExcelFirstSheet(file);
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeExcelRow(raw[i]);
    if (isEmptyDataRow(row)) {
      skipped++;
      continue;
    }
    const excelRow = i + 2;
    try {
      const nombre = cellStr(row['nombre']);
      if (!nombre) {
        throw new Error('nombre es obligatorio');
      }
      await firstValueFrom(api.post('/areas', { name: nombre, status: 'active' }));
      created++;
    } catch (e) {
      errors.push(`Fila ${excelRow}: ${e instanceof Error ? e.message : httpErr(e)}`);
    }
  }
  return { created, skipped, errors };
}

export interface ImportEmployeesExcelOptions {
  /** Solo administrador: la columna de líder admite cualquier usuario activo del área. */
  leaderAssignFromAllUsersInArea?: boolean;
}

export async function importEmployeesExcel(
  api: ApiService,
  file: File,
  opts?: ImportEmployeesExcelOptions,
): Promise<ImportSummary> {
  const raw = await parseExcelFirstSheet(file);
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  let areas: IdNameRow[] = [];
  let temporals: IdNameRow[] = [];
  let leaders: IdNameRow[] = [];
  let allUsersForAdmin: UserAreaRow[] | null = null;
  let areaByName: Map<string, number>;
  let temporalByName: Map<string, number>;
  let leaderByName: Map<string, number>;
  const activeAreas = () => areas.filter(isActiveRow);
  const activeTemporals = () => temporals.filter(isActiveRow);
  const activeLeaders = () => leaders.filter(isActiveRow);

  try {
    if (opts?.leaderAssignFromAllUsersInArea) {
      const [a, t, u] = await Promise.all([
        firstValueFrom(api.getAllPages<IdNameRow>('/areas')),
        firstValueFrom(api.getAllPages<IdNameRow>('/temporal-categories', { status: 'active' })),
        firstValueFrom(api.getAllPages<UserAreaRow>('/users')),
      ]);
      areas = a;
      temporals = t;
      allUsersForAdmin = u;
      leaders = u.filter((x) => (x.role || '').toUpperCase() === 'LEADER');
    } else {
      allUsersForAdmin = null;
      [areas, temporals, leaders] = await Promise.all([
        firstValueFrom(api.getAllPages<IdNameRow>('/areas')),
        firstValueFrom(api.getAllPages<IdNameRow>('/temporal-categories', { status: 'active' })),
        firstValueFrom(api.getAllPages<IdNameRow>('/users', { role: 'LEADER' })),
      ]);
    }
    areaByName = buildNameToIdMap(areas, 'Área');
    temporalByName = buildNameToIdMap(temporals, 'Categoría temporal');
    leaderByName = buildNameToIdMap(leaders, 'Líder');
  } catch (e) {
    return {
      created: 0,
      skipped: 0,
      errors: [
        `No se pudieron cargar áreas, categorías temporales o usuarios (¿tiene permiso ver usuarios?). ${httpErr(e)}`,
      ],
    };
  }

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeExcelRow(raw[i]);
    if (isEmptyDataRow(row)) {
      skipped++;
      continue;
    }
    const excelRow = i + 2;
    try {
      const nombre = cellStr(row['nombre']);
      const identificacion = cellStr(row['identificacion']);
      const cargo = cellStr(row['cargo']);
      if (!nombre || !identificacion || !cargo) {
        throw new Error('nombre, identificacion y cargo son obligatorios');
      }
      const areaId = resolveCatalogByIdOrName(row['area_id'], 'area_id', activeAreas(), areaByName);
      const temporalCatId = resolveCatalogByIdOrName(
        row['temporal_category_id'],
        'temporal_category_id',
        activeTemporals(),
        temporalByName,
      );
      const leaderId = resolveLeaderForEmployeeRow(
        row['leader_id'],
        areaId,
        activeLeaders(),
        leaderByName,
        allUsersForAdmin,
      );
      await firstValueFrom(
        api.post('/employees', {
          name: nombre,
          identification_number: identificacion,
          position: cargo,
          area_id: areaId,
          temporal_category_id: temporalCatId,
          leader_id: leaderId,
          status: 'active',
        }),
      );
      created++;
    } catch (e) {
      errors.push(`Fila ${excelRow}: ${e instanceof Error ? e.message : httpErr(e)}`);
    }
  }
  return { created, skipped, errors };
}
