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
  description: string;
  support: string | null;
  file_url: string | null;
  start_date: string;
  end_date: string | null;
  long_absence_document_kind: string | null;
  long_absence_second_file_url: string | null;
  long_absence_eps_transcribed_text: string | null;
  status: string;
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
        <button mat-stroked-button type="button" [disabled]="exporting" (click)="downloadExcel()">
          <mat-icon>download</mat-icon>
          {{ exporting ? 'Generando…' : 'Descargar Excel' }}
        </button>
        @if (auth.hasAnyRole(['ADMIN', 'HR', 'MANAGEMENT', 'LEADER'])) {
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
            <th mat-header-cell *matHeaderCellDef>Inicio</th>
            <td mat-cell *matCellDef="let r">{{ r.start_date }}</td>
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
                @if (auth.hasAnyRole(['ADMIN', 'MANAGEMENT']) && r.status === 'pending') {
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

  /** Permiso efectivo del backend (incapacity.extension). */
  readonly canRegisterExtension = signal(false);

  rows: NoteRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  exporting = false;
  searchText = '';
  leaderOptions: LeaderOption[] = [];
  /** `null` = sin filtro por líder */
  selectedLeaderId: number | null = null;
  private searchQuery = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly tableColumns = [
    'id',
    'employee',
    'type',
    'temporal',
    'eps_arl',
    'diagnosis',
    'start_date',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.api.get<{ code: string }[]>('/users/me/permissions').subscribe({
      next: (perms) => {
        this.canRegisterExtension.set(perms.some((p) => p.code === 'incapacity.extension'));
      },
      error: () => this.canRegisterExtension.set(false),
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

  downloadExcel(): void {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    const exportParams: Record<string, string | number> = {};
    if (this.searchQuery) {
      exportParams['search'] = this.searchQuery;
    }
    if (this.selectedLeaderId != null) {
      exportParams['leader_id'] = this.selectedLeaderId;
    }
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
            Descripción: r.description,
            'Fecha inicio': r.start_date,
            'Fecha fin': r.end_date ?? '',
            'Doc. 3+ días (HC / EPS)':
              r.long_absence_document_kind != null
                ? (LABELS.longAbsenceDocumentKind as Record<string, string>)[r.long_absence_document_kind] ??
                  r.long_absence_document_kind
                : '',
            'Soporte adicional (imagen)': r.long_absence_second_file_url ? 'Sí' : '',
            'Texto transcrito EPS': r.long_absence_eps_transcribed_text?.trim() ?? '',
            Estado: statusMap[r.status] ?? r.status,
          }));
          const stamp = new Date().toISOString().slice(0, 10);
          await downloadExcelFile(rows, `incapacidades_${stamp}.xlsx`, 'Incapacidades');
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
