import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LABELS } from '../../core/i18n/labels';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { openReportExportPeriodDialog } from '../../shared/report-export-period-dialog/open-report-export-period-dialog';
import { IncapacityCreateDialogComponent } from './incapacity-create-dialog.component';
import { IncapacityExtensionDialogComponent } from './incapacity-extension-dialog.component';
import { IncapacityViewDialogComponent } from './incapacity-view-dialog.component';

interface LeaderOption {
  id: number;
  name: string;
}

interface NoteRow {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_identification: string;
  type: string;
  temporal_category_id: number;
  temporal_category_name: string;
  eps_arl_id: number | null;
  eps_arl_label: string;
  diagnosis_id: number | null;
  diagnosis_code: string;
  diagnosis_name: string;
  description: string | null;
  support: string | null;
  file_url: string | null;
  start_date: string;
  end_date: string | null;
  causation_quincena_label?: string | null;
  long_absence_document_kind: string | null;
  long_absence_second_file_url: string | null;
  long_absence_eps_transcribed_text: string | null;
  status: string;
  record_kind?: string;
  extensions?: { id: number }[];
}

@Component({
  selector: 'em-incapacity',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateLabelPipe,
  ],
  template: `
    <div class="page-head">
      <h1>Incapacidad</h1>
      <div class="actions">
        <button mat-stroked-button type="button" [disabled]="exporting" (click)="openExportDialog()">
          <mat-icon>download</mat-icon>
          {{ exporting ? 'Generando…' : 'Descargar reporte' }}
        </button>
        @if (canCreate()) {
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nuevo registro
          </button>
        }
      </div>
      <p class="page-lead">
        Líderes y talento humano registran casos.
      </p>
    </div>
    <div class="search-row">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Empleado</mat-label>
        <mat-icon matPrefix class="search-prefix">search</mat-icon>
        <input
          matInput
          [(ngModel)]="searchText"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Nombre o identificación del empleado"
          autocomplete="off"
        />
      </mat-form-field>
      <mat-form-field appearance="outline" class="search-field leader-select-field">
        <mat-label>Líder</mat-label>
        <mat-icon matPrefix class="search-prefix">supervisor_account</mat-icon>
        <mat-select
          [(ngModel)]="selectedLeaderId"
          (ngModelChange)="onLeaderFilterChange()"
          placeholder="Todos"
        >
          <mat-option [value]="null">Todos los líderes</mat-option>
          @for (l of leaderOptions; track l.id) {
            <mat-option [value]="l.id">{{ l.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="search-field record-kind-field">
        <mat-label>Registro</mat-label>
        <mat-icon matPrefix class="search-prefix">category</mat-icon>
        <mat-select
          [(ngModel)]="recordKindFilter"
          (ngModelChange)="onRecordKindFilterChange()"
          placeholder="Todos"
        >
          <mat-option value="all">Todos</mat-option>
          <mat-option value="inicial">Solo inicial</mat-option>
          <mat-option value="prorroga">Con prórroga</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let r">{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>Empleado</th>
            <td mat-cell *matCellDef="let r">
              <div class="emp-cell">
                <span class="emp-name">{{ r.employee_name }}</span>
                @if (r.employee_identification) {
                  <span class="emp-id">{{ r.employee_identification }}</span>
                }
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="record_kind">
            <th mat-header-cell *matHeaderCellDef>Registro</th>
            <td mat-cell *matCellDef="let r">
              @if (isProrrogaRecord(r)) {
                <span class="record-badge record-badge--extension">Prórroga</span>
              } @else {
                <span class="record-badge record-badge--initial">Inicial</span>
                @if (hasExtension(r)) {
                  <span class="record-badge record-badge--extension">Prórroga</span>
                }
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let r">{{ r.type | translateLabel: 'incapacityType' }}</td>
          </ng-container>
          <ng-container matColumnDef="temporal">
            <th mat-header-cell *matHeaderCellDef>Temporal</th>
            <td mat-cell *matCellDef="let r">{{ r.temporal_category_name }}</td>
          </ng-container>
          <ng-container matColumnDef="eps_arl">
            <th mat-header-cell *matHeaderCellDef>EPS/ARL</th>
            <td mat-cell *matCellDef="let r">{{ r.eps_arl_label || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="diagnosis">
            <th mat-header-cell *matHeaderCellDef>Diagnóstico</th>
            <td mat-cell *matCellDef="let r">
              @if (r.diagnosis_code) {
                {{ r.diagnosis_code }} — {{ r.diagnosis_name }}
              } @else {
                —
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="start_date">
            <th mat-header-cell *matHeaderCellDef>Inicio real</th>
            <td mat-cell *matCellDef="let r">{{ r.start_date }}</td>
          </ng-container>
          <ng-container matColumnDef="end_date">
            <th mat-header-cell *matHeaderCellDef>Fin real</th>
            <td mat-cell *matCellDef="let r">{{ r.end_date || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="quincena">
            <th mat-header-cell *matHeaderCellDef>Quincena causación</th>
            <td mat-cell *matCellDef="let r">{{ r.causation_quincena_label || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">{{ r.status | translateLabel: 'entityStatus' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="col-actions">Acciones</th>
            <td mat-cell *matCellDef="let r" class="col-actions">
              <div class="action-row actions-cell">
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-view"
                  (click)="openViewDetail(r.id)"
                  matTooltip="Ver historial de la solicitud"
                  matTooltipPosition="above"
                  aria-label="Ver historial de la solicitud"
                >
                  <mat-icon>history</mat-icon>
                </button>
                @if (canRegisterExtension()) {
                  <button
                    mat-icon-button
                    type="button"
                    color="primary"
                    (click)="openExtension(r)"
                    matTooltip="Registrar prórroga"
                    matTooltipPosition="above"
                    aria-label="Registrar prórroga"
                  >
                    <mat-icon>more_time</mat-icon>
                  </button>
                }
                @if (canApprove() && r.status === 'pending') {
                  <button
                    mat-icon-button
                    color="primary"
                    type="button"
                    (click)="resolve(r, true)"
                    matTooltip="Aprobar registro"
                    matTooltipPosition="above"
                    aria-label="Aprobar registro"
                  >
                    <mat-icon>check_circle</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="warn"
                    type="button"
                    (click)="resolve(r, false)"
                    matTooltip="Rechazar registro"
                    matTooltipPosition="above"
                    aria-label="Rechazar registro"
                  >
                    <mat-icon>cancel</mat-icon>
                  </button>
                }
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="tableColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: tableColumns"></tr>
        </table>
        <mat-paginator
          [length]="total"
          [pageIndex]="page - 1"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
        />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .search-row {
      margin-bottom: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
    }
    .search-field {
      flex: 1 1 260px;
      min-width: min(100%, 240px);
      max-width: 420px;
    }
    .record-kind-field {
      flex: 1 1 200px;
      min-width: min(100%, 200px);
      max-width: 280px;
    }
    .record-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      line-height: 1.35;
      margin-right: 0.25rem;
    }
    .record-badge--initial {
      background: rgba(25, 118, 210, 0.1);
      color: #1565c0;
    }
    .record-badge--extension {
      background: rgba(237, 108, 2, 0.12);
      color: #e65100;
    }
    .search-prefix {
      margin-right: 0.25rem;
      color: rgba(0, 0, 0, 0.45);
      vertical-align: middle;
    }
    .emp-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      line-height: 1.35;
    }
    .emp-name {
      font-weight: 500;
    }
    .emp-id {
      font-size: 0.8125rem;
      color: rgba(0, 0, 0, 0.55);
    }
    .full {
      min-width: 800px;
      width: 100%;
    }
    .col-actions {
      text-align: right;
      white-space: nowrap;
      width: 1%;
    }
    .actions-cell {
      justify-content: flex-end;
    }
  `,
})
export class IncapacityComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'incapacity')) {
        this.load();
      }
    });
  }

  /** Permisos efectivos del perfil (sincronizados con el backend). */
  readonly canCreate = signal(false);
  readonly canRegisterExtension = signal(false);
  readonly canApprove = signal(false);

  rows: NoteRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  exporting = false;
  searchText = '';
  leaderOptions: LeaderOption[] = [];
  /** `null` = sin filtro por líder */
  selectedLeaderId: number | null = null;
  /** all | inicial | prorroga */
  recordKindFilter: 'all' | 'inicial' | 'prorroga' = 'all';
  private searchQuery = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly tableColumns = [
    'id',
    'employee',
    'record_kind',
    'type',
    'temporal',
    'eps_arl',
    'diagnosis',
    'start_date',
    'end_date',
    'quincena',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.api.get<{ code: string }[]>('/users/me/permissions').subscribe({
      next: (perms) => {
        this.auth.syncPermissionsFromResponse(perms);
        const codes = new Set(perms.map((p) => p.code));
        this.canCreate.set(codes.has('incapacity.create'));
        this.canRegisterExtension.set(
          codes.has('incapacity.extension') || codes.has('incapacity.create'),
        );
        this.canApprove.set(codes.has('incapacity.approve'));
      },
      error: () => {
        this.canCreate.set(false);
        this.canRegisterExtension.set(false);
        this.canApprove.set(false);
      },
    });
    this.api.get<LeaderOption[]>('/incapacity-notes/leader-filter-options').subscribe({
      next: (opts) => {
        this.leaderOptions = opts ?? [];
      },
      error: () => {
        this.leaderOptions = [];
      },
    });
    this.load();
  }

  onSearchChange(value: string): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.searchQuery = (value || '').trim();
      this.page = 1;
      this.load();
    }, 350);
  }

  onLeaderFilterChange(): void {
    this.page = 1;
    this.load();
  }

  onRecordKindFilterChange(): void {
    this.page = 1;
    this.load();
  }

  hasExtension(row: NoteRow): boolean {
    return (row.extensions?.length ?? 0) > 0;
  }

  isProrrogaRecord(row: NoteRow): boolean {
    return row.record_kind === 'prorroga';
  }

  recordKindLabel(row: NoteRow): string {
    if (this.isProrrogaRecord(row)) {
      return 'Prórroga';
    }
    if (this.hasExtension(row)) {
      return 'Inicial · Prórroga';
    }
    return 'Inicial';
  }

  openViewDetail(noteId: number): void {
    this.dialog.open(IncapacityViewDialogComponent, {
      width: 'min(96vw, 560px)',
      data: noteId,
    });
  }

  openExtension(row: NoteRow): void {
    const minExtensionDate = row.end_date ?? row.start_date;
    this.dialog
      .open(IncapacityExtensionDialogComponent, {
        width: 'min(96vw, 480px)',
        data: { noteId: row.id, minExtensionDate },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  openExportDialog(): void {
    if (this.exporting) return;
    openReportExportPeriodDialog(this.dialog, {
      title: 'Reporte de incapacidades',
      description: 'Seleccione el periodo de corte para exportar los registros de incapacidad.',
    })
      .afterClosed()
      .subscribe((period) => {
        if (period) this.downloadExcel(period.dateFrom, period.dateTo);
      });
  }

  private downloadExcel(dateFrom: string, dateTo: string): void {
    this.exporting = true;
    const exportParams: Record<string, string | number> = {
      date_from: dateFrom,
      date_to: dateTo,
    };
    if (this.searchQuery) exportParams['search'] = this.searchQuery;
    if (this.selectedLeaderId != null) exportParams['leader_id'] = this.selectedLeaderId;
    this.api.getAllPages<NoteRow>('/incapacity-notes', exportParams).subscribe({
      next: async (items) => {
        try {
          const { downloadExcelFile } = await import('../../core/utils/excel-download');
          const typeMap = LABELS.incapacityType as Record<string, string>;
          const statusMap = LABELS.entityStatus as Record<string, string>;
          const rows = items.map((r) => ({
            ID: r.id,
            Empleado: r.employee_name,
            Identificación: r.employee_identification || '',
            Tipo: typeMap[r.type] ?? r.type,
            Temporal: r.temporal_category_name,
            'EPS/ARL': r.eps_arl_label || '',
            Diagnóstico: r.diagnosis_code ? `${r.diagnosis_code} — ${r.diagnosis_name}` : '',
            Descripción: r.description ?? '',
            Registro: this.recordKindLabel(r),
            'Fecha inicio real': r.start_date,
            'Fecha fin real': r.end_date ?? '',
            'Quincena causación': r.causation_quincena_label ?? '',
            'Doc. 3+ días (HC / EPS)':
              r.long_absence_document_kind != null
                ? (LABELS.longAbsenceDocumentKind as Record<string, string>)[r.long_absence_document_kind] ??
                  r.long_absence_document_kind
                : '',
            'Soporte adicional (imagen)': r.long_absence_second_file_url ? 'Sí' : '',
            'Texto transcrito EPS': r.long_absence_eps_transcribed_text?.trim() ?? '',
            Estado: statusMap[r.status] ?? r.status,
          }));
          await downloadExcelFile(
            rows,
            `incapacidades_${dateFrom}_${dateTo}.xlsx`,
            'Incapacidades',
          );
        } finally {
          this.exporting = false;
        }
      },
      error: () => {
        this.exporting = false;
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(IncapacityCreateDialogComponent, { width: 'min(96vw, 520px)' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  resolve(row: NoteRow, approved: boolean): void {
    const msg = approved ? '¿Aprobar este registro?' : '¿Rechazar este registro?';
    if (!confirm(msg)) {
      return;
    }
    this.api
      .patch(`/incapacity-notes/${row.id}`, {
        status: approved ? 'approved' : 'rejected',
      })
      .subscribe({
        next: () => this.load(),
      });
  }

  load(): void {
    const params: Record<string, string | number> = {
      page: this.page,
      page_size: this.pageSize,
    };
    if (this.searchQuery) {
      params['search'] = this.searchQuery;
    }
    if (this.selectedLeaderId != null) {
      params['leader_id'] = this.selectedLeaderId;
    }
    if (this.recordKindFilter === 'inicial') {
      params['has_extension'] = 'false';
    } else if (this.recordKindFilter === 'prorroga') {
      params['has_extension'] = 'true';
    }
    this.api.get<Paginated<NoteRow>>('/incapacity-notes', params).subscribe((res) => {
      this.rows = res.items;
      this.total = res.total;
    });
  }

  onPage(ev: PageEvent): void {
    this.page = ev.pageIndex + 1;
    this.pageSize = ev.pageSize;
    this.load();
  }
}
