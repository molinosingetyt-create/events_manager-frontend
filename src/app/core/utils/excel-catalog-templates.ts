import { downloadExcelFile, type ExcelRow } from './excel-download';

/** Plantilla: columnas en español (coinciden con lo que espera el importador). */

export async function downloadDiagnosisTemplate(): Promise<void> {
  const rows: ExcelRow[] = [
    {
      codigo: 'A00.0',
      nombre: 'Ejemplo: cólera (reemplace o amplíe filas)',
      descripcion: 'Opcional',
    },
  ];
  await downloadExcelFile(rows, 'plantilla_diagnosticos.xlsx', 'Diagnósticos');
}

export async function downloadEpsArlTemplate(): Promise<void> {
  const rows: ExcelRow[] = [
    {
      tipo: 'eps',
      nombre: 'Ejemplo EPS',
      codigo: 'OPCIONAL',
    },
    {
      tipo: 'arl',
      nombre: 'Ejemplo ARL',
      codigo: '',
    },
  ];
  await downloadExcelFile(rows, 'plantilla_eps_arl.xlsx', 'EPS_ARL');
}

export async function downloadTemporalTemplate(): Promise<void> {
  const rows: ExcelRow[] = [
    {
      nombre: 'Ejemplo categoría temporal',
    },
  ];
  await downloadExcelFile(rows, 'plantilla_temporal.xlsx', 'Temporal');
}

export async function downloadAreaTemplate(): Promise<void> {
  const rows: ExcelRow[] = [
    {
      nombre: 'Ejemplo área',
    },
  ];
  await downloadExcelFile(rows, 'plantilla_areas.xlsx', 'Áreas');
}

export async function downloadEmployeeTemplate(): Promise<void> {
  const rows: ExcelRow[] = [
    {
      nombre: 'LUIS ALBERTO RAMIREZ JIMENEZ',
      identificacion: '19500836',
      cargo: 'JEFE DE TURNO TRIGO/MAIZ',
      area_id: 'TRIGO',
      temporal_category_id: 'MOLINOS',
      leader_id: 'Ana María Gómez',
    },
  ];
  await downloadExcelFile(rows, 'plantilla_empleados.xlsx', 'Empleados');
}
