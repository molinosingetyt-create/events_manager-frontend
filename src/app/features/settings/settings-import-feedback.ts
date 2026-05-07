import { MatSnackBar } from '@angular/material/snack-bar';
import type { ImportSummary } from '../../core/utils/excel-import-runners';

export function showImportFeedback(snack: MatSnackBar, s: ImportSummary): void {
  const msg = `Creados: ${s.created}. Filas vacías omitidas: ${s.skipped}.`;
  if (s.errors.length === 0) {
    snack.open(msg, 'Cerrar', { duration: 5000 });
    return;
  }
  snack.open(`${msg} Revise el cuadro de detalle de errores.`, 'Cerrar', { duration: 8000 });
  alert(s.errors.join('\n'));
}
