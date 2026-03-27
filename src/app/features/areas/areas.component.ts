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
import { AreaCreateDialogComponent } from './area-create-dialog.component';
import { AreaEditDialogComponent } from './area-edit-dialog.component';
import { AreaViewDialogComponent } from './area-view-dialog.component';

interface AreaRow {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'em-areas',
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
      <h1>Áreas</h1>
      @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add_business</mat-icon>
            Nueva área
          </button>
        </div>
      }
      <p class="page-lead">Unidades organizativas del negocio.</p>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let r">{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let r">{{ r.name }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">{{ r.status | translateLabel: 'entityStatus' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let r">
              <div class="action-row">
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-view"
                  (click)="openView(r)"
                  matTooltip="Ver detalle del área"
                  matTooltipPosition="above"
                  aria-label="Ver detalle del área"
                >
                  <mat-icon>visibility</mat-icon>
                </button>
                @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
                  <button
                    mat-icon-button
                    type="button"
                    class="action-btn-edit"
                    (click)="openEdit(r)"
                    matTooltip="Editar área"
                    matTooltipPosition="above"
                    aria-label="Editar área"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    class="action-btn-delete"
                    (click)="deleteArea(r)"
                    matTooltip="Dar de baja (marca como inactiva)"
                    matTooltipPosition="above"
                    aria-label="Dar de baja área"
                  >
                    <mat-icon>domain_disabled</mat-icon>
                  </button>
                }
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
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
      min-width: 560px;
      width: 100%;
    }
  `,
})
export class AreasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  rows: AreaRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  readonly columns = ['id', 'name', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(AreaCreateDialogComponent, { width: 'min(96vw, 420px)' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  openView(row: AreaRow): void {
    this.dialog.open(AreaViewDialogComponent, {
      width: 'min(96vw, 400px)',
      data: row,
    });
  }

  openEdit(row: AreaRow): void {
    this.dialog
      .open(AreaEditDialogComponent, {
        width: 'min(96vw, 420px)',
        data: row.id,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  deleteArea(row: AreaRow): void {
    if (!confirm(`¿Dar de baja el área «${row.name}»? (se marcará como inactiva)`)) {
      return;
    }
    this.api.delete(`/areas/${row.id}`).subscribe({
      next: () => this.load(),
    });
  }

  load(): void {
    this.api
      .get<Paginated<AreaRow>>('/areas', { page: this.page, page_size: this.pageSize })
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
