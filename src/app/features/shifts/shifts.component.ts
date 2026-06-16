import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { ShiftsCreateDialogComponent } from './shifts-create-dialog.component';

interface ShiftRow {
  id: number;
  employee_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  time_range_label?: string | null;
  notes?: string | null;
}

@Component({
  selector: 'em-shifts',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="page-head">
      <h1>Programación de turnos</h1>
      <div class="actions">
        <button mat-stroked-button type="button" [disabled]="exporting" (click)="downloadExcel()">
          <mat-icon>download</mat-icon>
          {{ exporting ? 'Generando…' : 'Descargar Excel' }}
        </button>
        @if (auth.hasPermission('shifts.create')) {
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nuevo turno
          </button>
        }
      </div>
    </div>
    <div class="filter-row">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Desde (corte)</mat-label>
        <input matInput type="date" [(ngModel)]="dateFrom" (change)="onFilterChange()" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Hasta (corte)</mat-label>
        <input matInput type="date" [(ngModel)]="dateTo" (change)="onFilterChange()" />
      </mat-form-field>
      <button mat-stroked-button type="button" (click)="clearPeriodFilter()">Limpiar periodo</button>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="employee"><th mat-header-cell *matHeaderCellDef>Empleado</th><td mat-cell *matCellDef="let r">{{ r.employee_name }}</td></ng-container>
          <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Fecha</th><td mat-cell *matCellDef="let r">{{ r.shift_date }}</td></ng-container>
          <ng-container matColumnDef="time"><th mat-header-cell *matHeaderCellDef>Horario</th><td mat-cell *matCellDef="let r">{{ timeLabel(r) }}</td></ng-container>
          <ng-container matColumnDef="notes"><th mat-header-cell *matHeaderCellDef>Notas</th><td mat-cell *matCellDef="let r">{{ r.notes || '—' }}</td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        <mat-paginator [length]="total" [pageIndex]="page - 1" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .filter-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; align-items: center; }
    .filter-field { width: min(100%, 200px); }
    .full { min-width: 640px; width: 100%; }
  `,
})
export class ShiftsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);
  rows: ShiftRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  exporting = false;
  dateFrom = '';
  dateTo = '';
  readonly cols = ['employee', 'date', 'time', 'notes'];

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'shifts')) this.load();
    });
  }

  ngOnInit(): void { this.load(); }

  timeLabel(r: ShiftRow): string {
    if (r.time_range_label) return r.time_range_label;
    if (r.start_time && r.end_time) return `${r.start_time.slice(0, 5)} – ${r.end_time.slice(0, 5)}`;
    return '—';
  }

  private listParams(): Record<string, string | number> {
    const p: Record<string, string | number> = {};
    if (this.dateFrom) p['date_from'] = this.dateFrom;
    if (this.dateTo) p['date_to'] = this.dateTo;
    return p;
  }

  load(): void {
    this.api.get<Paginated<ShiftRow>>('/shift-schedules', { page: this.page, page_size: this.pageSize, ...this.listParams() }).subscribe((res) => {
      this.rows = res.items;
      this.total = res.total;
    });
  }

  onFilterChange(): void { this.page = 1; this.load(); }
  clearPeriodFilter(): void { this.dateFrom = ''; this.dateTo = ''; this.onFilterChange(); }
  onPage(ev: PageEvent): void { this.page = ev.pageIndex + 1; this.pageSize = ev.pageSize; this.load(); }

  openCreate(): void {
    this.dialog.open(ShiftsCreateDialogComponent, { width: 'min(96vw, 520px)' }).afterClosed().subscribe((ok) => { if (ok) this.load(); });
  }

  downloadExcel(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.api.getAllPages<ShiftRow>('/shift-schedules', this.listParams()).subscribe({
      next: async (items) => {
        try {
          const { downloadExcelFile } = await import('../../core/utils/excel-download');
          const rows = items.map((r) => ({
            Empleado: r.employee_name,
            Fecha: r.shift_date,
            'Hora inicio': r.start_time?.slice(0, 5) ?? '',
            'Hora fin': r.end_time?.slice(0, 5) ?? '',
            Notas: r.notes ?? '',
          }));
          const period = this.dateFrom && this.dateTo ? `${this.dateFrom}_${this.dateTo}` : new Date().toISOString().slice(0, 10);
          await downloadExcelFile(rows, `turnos_${period}.xlsx`, 'Turnos');
        } finally { this.exporting = false; }
      },
      error: () => { this.exporting = false; },
    });
  }
}
