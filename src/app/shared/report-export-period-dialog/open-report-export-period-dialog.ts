import { MatDialog } from '@angular/material/dialog';
import {
  ReportExportPeriodDialogComponent,
  type ReportExportPeriodDialogData,
  type ReportExportPeriodResult,
} from './report-export-period-dialog.component';

export function openReportExportPeriodDialog(
  dialog: MatDialog,
  data?: ReportExportPeriodDialogData,
) {
  return dialog.open<ReportExportPeriodDialogComponent, ReportExportPeriodDialogData, ReportExportPeriodResult>(
    ReportExportPeriodDialogComponent,
    {
      width: 'min(96vw, 420px)',
      data: data ?? {},
    },
  );
}
