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
import { IncapacityCreateDialogComponent } from './incapacity-create-dialog.component';
import { IncapacityViewDialogComponent } from './incapacity-view-dialog.component';

interface NoteRow {
  id: number;
  employee_id: number;
  employee_name: string;
  type: string;
  description: string;
  support: string | null;
  file_url: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
}

@Component({
  selector: 'em-incapacity',
  standalone: true,
  imports: [
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
      <h1>Incapacidades y notas</h1>
      @if (auth.hasAnyRole(['ADMIN', 'HR', 'MANAGEMENT', 'LEADER'])) {
        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Nuevo registro
          </button>
        </div>
      }
      <p class="page-lead">
        Administración y talento humano registran casos pendientes; <strong>gerencia</strong> o el <strong>administrador</strong> pueden aprobar o rechazar.
      </p>
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
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let r">{{ r.type | translateLabel: 'incapacityType' }}</td>
          </ng-container>
          <ng-container matColumnDef="start_date">
            <th mat-header-cell *matHeaderCellDef>Inicio</th>
            <td mat-cell *matCellDef="let r">{{ r.start_date }}</td>
          </ng-container>
          <ng-container matColumnDef="support">
            <th mat-header-cell *matHeaderCellDef>Soporte</th>
            <td mat-cell *matCellDef="let r">
              @if (r.file_url) {
                <mat-icon class="support-icon-img" matTooltip="Imagen de soporte" matTooltipShowDelay="200"
                  >image</mat-icon
                >
              } @else if (r.support) {
                <span class="support-cell" [matTooltip]="r.support" matTooltipShowDelay="200">{{ supportPreview(r.support) }}</span>
              } @else {
                —
              }
            </td>
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
                @if (auth.hasAnyRole(['ADMIN', 'MANAGEMENT']) && r.status === 'pending') {
                  <button
                    mat-icon-button
                    color="primary"
                    type="button"
                    (click)="resolve(r, true)"
                    matTooltip="Aprobar registro de incapacidad o nota"
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
                    matTooltip="Rechazar registro de incapacidad o nota"
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
    .full {
      min-width: 800px;
      width: 100%;
    }
    .support-cell {
      display: inline-block;
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: bottom;
    }
    .support-icon-img {
      color: var(--em-brand-navy, #1a2b6d);
      vertical-align: middle;
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
  readonly auth = inject(AuthService);

  rows: NoteRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;

  readonly tableColumns = ['id', 'employee', 'type', 'start_date', 'support', 'status', 'actions'];

  supportPreview(text: string): string {
    const t = text.trim();
    return t.length > 48 ? `${t.slice(0, 48)}…` : t;
  }

  ngOnInit(): void {
    this.load();
  }

  openViewDetail(noteId: number): void {
    this.dialog.open(IncapacityViewDialogComponent, {
      width: 'min(96vw, 560px)',
      data: noteId,
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
    const msg = approved
      ? '¿Aprobar este registro de incapacidad/nota?'
      : '¿Rechazar este registro de incapacidad/nota?';
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
    this.api
      .get<Paginated<NoteRow>>('/incapacity-notes', { page: this.page, page_size: this.pageSize })
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
