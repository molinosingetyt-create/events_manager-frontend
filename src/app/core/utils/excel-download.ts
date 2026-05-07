/** Fila plana para exportar (valores serializables). */
export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

/**
 * Genera un archivo .xlsx en el navegador y dispara la descarga.
 * Carga SheetJS solo al llamar (import dinámico).
 * `sheetName` se trunca a 31 caracteres (límite de Excel).
 */
export async function downloadExcelFile(
  rows: ExcelRow[],
  filename: string,
  sheetName = 'Informe',
): Promise<void> {
  const XLSX = await import('xlsx');
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const tab = sheetName.slice(0, 31);

  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['(sin datos)']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab);
    XLSX.writeFile(wb, name);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tab);
  XLSX.writeFile(wb, name);
}
