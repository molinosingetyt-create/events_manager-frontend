import { NgClass } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
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
      @if (auth.hasAnyRole(['ADMIN', 'HR', 'MANAGEMENT', 'LEADER'])) {
        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nueva solicitud
          </button>
        </div>
      }
      <p class="page-lead">La aprobación o rechazo final lo realizan <strong>gerencia</strong> o <strong>administración</strong>.</p>
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
      background: #fffbeb;
      color: #a16207;
      border-color: #fde68a;
    }
    .em-status-pill--rejected {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .em-status-pill--approved {
      background: #f0fdf4;
      color: #047857;
      border-color: #bbf7d0;
    }
    .em-status-pill--default {
      background: #f9fafb;
      color: #4b5563;
      border-color: #e5e7eb;
    }
  `,
})
export class OvertimeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  rows: OvertimeListRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;

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
