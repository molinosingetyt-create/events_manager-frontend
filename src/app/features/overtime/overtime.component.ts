import { NgClass } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LABELS } from '../../core/i18n/labels';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { OvertimeCreateDialogComponent } from './overtime-create-dialog.component';
import { OvertimeDecisionDialogComponent } from './overtime-decision-dialog.component';
import { OvertimeViewDialogComponent } from './overtime-view-dialog.component';

/** Fila del listado (respuesta del API con datos enriquecidos). */
interface OvertimeListRow {
  id: number;
  employee_id: number;
  employee_name: string;
  requested_by: number;
  requester: { id: number; name: string; email: string };
  date: string;
  hours: string;
  justification: string;
  status: string;
  approved_by: number | null;
  approver: { id: number; name: string; email: string } | null;
  approval_comment: string | null;
  created_at: string;
  updated_at: string;
  history: unknown[];
}

@Component({
  selector: 'em-overtime',
  standalone: true,
  imports: [
    NgClass,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslateLabelPipe,
  ],
  template: `
    <div class="page-head">
      <h1>Solicitudes de horas extra</h1>
      <div class="actions">
        <button mat-stroked-button type="button" [disabled]="exporting" (click)="downloadExcel()">
          <mat-icon>download</mat-icon>
          {{ exporting ? 'Generando…' : 'Descargar Excel' }}
        </button>
        @if (auth.hasAnyRole(['ADMIN', 'HR', 'MANAGEMENT', 'LEADER'])) {
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nueva solicitud
          </button>
        }
      </div>
      <p class="page-lead">La aprobación o rechazo final lo realizan <strong>gerencia</strong>.</p>
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
            <td mat-cell *matCellDef="let r">{{ r.employee_name }}</td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let r">{{ r.date }}</td>
          </ng-container>
          <ng-container matColumnDef="hours">
            <th mat-header-cell *matHeaderCellDef>Horas</th>
            <td mat-cell *matCellDef="let r">{{ r.hours }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">
              <span class="em-status-pill" [ngClass]="statusPillClass(r.status)">
                {{ r.status | translateLabel: 'entityStatus' }}
              </span>
            </td>
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
                @if (auth.hasAnyRole(['ADMIN', 'MANAGEMENT']) && r.status === 'pending') {
                  <button
                    mat-icon-button
                    color="primary"
                    type="button"
                    (click)="openDecision(r, true)"
                    matTooltip="Aprobar solicitud de horas extra"
                    matTooltipPosition="above"
                    aria-label="Aprobar solicitud"
                  >
                    <mat-icon>check_circle</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="warn"
                    type="button"
                    (click)="openDecision(r, false)"
                    matTooltip="Rechazar solicitud de horas extra"
                    matTooltipPosition="above"
                    aria-label="Rechazar solicitud"
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
    .full {
      min-width: 720px;
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
    .em-status-pill {
      display: inline-block;
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.35;
      border: 1px solid transparent;
    }
    /* Tonos pastel “nieve”: suaves y legibles sobre fila blanca */
    .em-status-pill--pending {
      background: #FCEDD9;
      color: #A37F3E;
      border-color: #E9C04C;
    }
    .em-status-pill--rejected {
      background: #FCEFD9;
      color: #C7272D;
      border-color: #FCEFD9;
    }
    .em-status-pill--approved {
      background: #f0fdf4;
      color: #103847;
      border-color: #FCEFD9;
    }
    .em-status-pill--default {
      background: #FCEDD9;
      color: #103847;
      border-color: #FCEDD9;
    }
  `,
})
export class OvertimeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'overtime')) {
        this.load();
      }
    });
  }

  rows: OvertimeListRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  exporting = false;

  readonly tableColumns = ['id', 'employee', 'date', 'hours', 'status', 'actions'];

  /** Clases visuales para el estado (pending / rejected / approved). */
  statusPillClass(status: string): Record<string, boolean> {
    const k = status ?? '';
    return {
      'em-status-pill--pending': k === 'pending',
      'em-status-pill--rejected': k === 'rejected',
      'em-status-pill--approved': k === 'approved',
      'em-status-pill--default':
        k !== 'pending' && k !== 'rejected' && k !== 'approved',
    };
  }

  ngOnInit(): void {
    this.load();
  }

  openViewDetail(requestId: number): void {
    this.dialog.open(OvertimeViewDialogComponent, {
      width: 'min(96vw, 560px)',
      data: requestId,
    });
  }

  downloadExcel(): void {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    this.api.getAllPages<OvertimeListRow>('/overtime-requests').subscribe({
      next: async (items) => {
        try {
          const { downloadExcelFile } = await import('../../core/utils/excel-download');
          const statusMap = LABELS.entityStatus as Record<string, string>;
          const rows = items.map((r) => ({
            ID: r.id,
            Empleado: r.employee_name,
            Fecha: r.date,
            Horas: r.hours,
            Estado: statusMap[r.status] ?? r.status,
            Justificación: r.justification,
            Solicitante: r.requester?.name ?? '',
            'Correo solicitante': r.requester?.email ?? '',
            Aprobador: r.approver?.name ?? '',
            'Correo aprobador': r.approver?.email ?? '',
            'Comentario de decisión': r.approval_comment?.trim() ? r.approval_comment : '',
            'Creado': r.created_at,
            'Actualizado': r.updated_at,
          }));
          const stamp = new Date().toISOString().slice(0, 10);
          await downloadExcelFile(rows, `horas_extra_${stamp}.xlsx`, 'Horas extra');
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
      .open(OvertimeCreateDialogComponent, { width: 'min(96vw, 520px)' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  openDecision(row: OvertimeListRow, approve: boolean): void {
    this.dialog
      .open(OvertimeDecisionDialogComponent, {
        width: 'min(96vw, 420px)',
        data: { requestId: row.id, approve },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  load(): void {
    this.api
      .get<Paginated<OvertimeListRow>>('/overtime-requests', {
        page: this.page,
        page_size: this.pageSize,
      })
      .subscribe((res) => {
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
