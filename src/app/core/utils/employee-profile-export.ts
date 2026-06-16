import type { ExcelRow } from './excel-download';
import { downloadExcelFile } from './excel-download';

export interface ProfileExportRowApi {
  employee_id: number;
  identification_number: string;
  name: string;
  position: string;
  area_name: string;
  leader_name?: string | null;
  status: string;
  work_site_city?: string | null;
  contract_type?: string | null;
  contract_end_date?: string | null;
  hire_date?: string | null;
  collaborator_status?: string | null;
  phone?: string | null;
  corporate_email?: string | null;
  personal_email?: string | null;
  completeness_percent: number;
  active_alerts_count: number;
  documents_count: number;
  education_count: number;
  training_count: number;
}

const CONTRACT_LABELS: Record<string, string> = {
  fijo: 'Término fijo',
  indefinido: 'Indefinido',
  obra_labor: 'Obra o labor',
  aprendizaje: 'Aprendizaje',
};

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo',
  vacaciones: 'Vacaciones',
  incapacidad: 'Incapacidad',
  suspendido: 'Suspendido',
  retirado: 'Retirado',
};

function fmtDate(v?: string | null): string {
  if (!v) return '';
  return String(v).slice(0, 10);
}

export function profileExportRowsToExcel(rows: ProfileExportRowApi[]): ExcelRow[] {
  return rows.map((r) => ({
    ID: r.employee_id,
    Documento: r.identification_number,
    Nombre: r.name,
    Cargo: r.position,
    Área: r.area_name,
    Líder: r.leader_name ?? '',
    Estado: r.status,
    Sede: r.work_site_city ?? '',
    'Tipo contrato': r.contract_type ? (CONTRACT_LABELS[r.contract_type] ?? r.contract_type) : '',
    'Vence contrato': fmtDate(r.contract_end_date),
    Ingreso: fmtDate(r.hire_date),
    'Estado colaborador': r.collaborator_status
      ? (STATUS_LABELS[r.collaborator_status] ?? r.collaborator_status)
      : '',
    Teléfono: r.phone ?? '',
    'Correo corporativo': r.corporate_email ?? '',
    'Correo personal': r.personal_email ?? '',
    'Completitud %': r.completeness_percent,
    Alertas: r.active_alerts_count,
    Documentos: r.documents_count,
    'Formación académica': r.education_count,
    Capacitaciones: r.training_count,
  }));
}

export async function downloadProfileExportExcel(rows: ProfileExportRowApi[]): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadExcelFile(
    profileExportRowsToExcel(rows),
    `expedientes_colaboradores_${stamp}.xlsx`,
    'Expedientes',
  );
}
