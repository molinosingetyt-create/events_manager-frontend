import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { openReportExportPeriodDialog } from '../../shared/report-export-period-dialog/open-report-export-period-dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { LABELS } from '../../core/i18n/labels';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { AbsenteeismCreateDialogComponent } from './absenteeism-create-dialog.component';

interface AbsenteeismRow {
  id: number;
  employee_name: string;
  classification: string;
  start_date: string;
  end_date: string;
  days: number;
  justification: string;
  status: string;
}

@Component({
  selector: 'em-absenteeism',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    TranslateLabelPipe,
  ],
  template: `
    <div class="page-head">
      <h1>Ausentismo</h1>
      <div class="actions">
        <button mat-stroked-button type="button" [disabled]="exporting" (click)="openExportDialog()">
          <mat-icon>download</mat-icon>
          {{ exporting ? 'Generando…' : 'Descargar reporte' }}
        </button>
        @if (auth.hasPermission('absenteeism.create')) {
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nuevo registro
          </button>
        }
      </div>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="employee"><th mat-header-cell *matHeaderCellDef>Empleado</th><td mat-cell *matCellDef="let r">{{ r.employee_name }}</td></ng-container>
          <ng-container matColumnDef="classification"><th mat-header-cell *matHeaderCellDef>Clasificación</th><td mat-cell *matCellDef="let r">{{ r.classification | translateLabel: 'absenteeismClassification' }}</td></ng-container>
          <ng-container matColumnDef="start"><th mat-header-cell *matHeaderCellDef>Inicio</th><td mat-cell *matCellDef="let r">{{ r.start_date }}</td></ng-container>
          <ng-container matColumnDef="end"><th mat-header-cell *matHeaderCellDef>Fin</th><td mat-cell *matCellDef="let r">{{ r.end_date }}</td></ng-container>
          <ng-container matColumnDef="days"><th mat-header-cell *matHeaderCellDef>Días</th><td mat-cell *matCellDef="let r">{{ r.days }}</td></ng-container>
          <ng-container matColumnDef="justification"><th mat-header-cell *matHeaderCellDef>Justificación</th><td mat-cell *matCellDef="let r">{{ r.justification }}</td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        <mat-paginator [length]="total" [pageIndex]="page - 1" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .full { min-width: 720px; width: 100%; }
  `,
})
export class AbsenteeismComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);
  rows: AbsenteeismRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  exporting = false;
  readonly cols = ['employee', 'classification', 'start', 'end', 'days', 'justification'];

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'absenteeism')) this.load();
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api
      .get<Paginated<AbsenteeismRow>>('/absenteeism-records', { page: this.page, page_size: this.pageSize })
      .subscribe((res) => {
        this.rows = res.items;
        this.total = res.total;
      });
  }

  onPage(ev: PageEvent): void { this.page = ev.pageIndex + 1; this.pageSize = ev.pageSize; this.load(); }

  openCreate(): void {
    this.dialog.open(AbsenteeismCreateDialogComponent, { width: 'min(96vw, 520px)' }).afterClosed().subscribe((ok) => { if (ok) this.load(); });
  }

  openExportDialog(): void {
    if (this.exporting) return;
    openReportExportPeriodDialog(this.dialog, {
      title: 'Reporte de ausentismo',
      description: 'Seleccione el periodo de corte para exportar los registros de ausentismo.',
    })
      .afterClosed()
      .subscribe((period) => {
        if (period) this.downloadExcel(period.dateFrom, period.dateTo);
      });
  }

  private downloadExcel(dateFrom: string, dateTo: string): void {
    this.exporting = true;
    this.api
      .getAllPages<AbsenteeismRow>('/absenteeism-records', { date_from: dateFrom, date_to: dateTo })
      .subscribe({
        next: async (items) => {
          try {
            const { downloadExcelFile } = await import('../../core/utils/excel-download');
            const classMap = LABELS.absenteeismClassification as Record<string, string>;
            const rows = items.map((r) => ({
              Empleado: r.employee_name,
              Clasificación: classMap[r.classification] ?? r.classification,
              'Fecha inicio': r.start_date,
              'Fecha fin': r.end_date,
              Días: r.days,
              Justificación: r.justification,
            }));
            await downloadExcelFile(rows, `ausentismo_${dateFrom}_${dateTo}.xlsx`, 'Ausentismo');
          } finally {
            this.exporting = false;
          }
        },
        error: () => {
          this.exporting = false;
        },
      });
  }
}
