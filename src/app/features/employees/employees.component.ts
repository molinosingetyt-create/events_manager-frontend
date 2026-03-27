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
import { EmployeeCreateDialogComponent } from './employee-create-dialog.component';
import { EmployeeEditDialogComponent } from './employee-edit-dialog.component';
import { EmployeeViewDialogComponent } from './employee-view-dialog.component';

interface EmployeeRow {
  id: number;
  name: string;
  identification_number: string;
  position: string;
  area_id: number;
  leader_id: number | null;
  status: string;
}

@Component({
  selector: 'em-employees',
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
      <h1>Empleados</h1>
      @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>person_add</mat-icon>
            Nuevo empleado
          </button>
        </div>
      }
      <p class="page-lead">Listado de personal y datos laborales.</p>
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
          <ng-container matColumnDef="identification_number">
            <th mat-header-cell *matHeaderCellDef>N.º identificación</th>
            <td mat-cell *matCellDef="let r">{{ r.identification_number }}</td>
          </ng-container>
          <ng-container matColumnDef="position">
            <th mat-header-cell *matHeaderCellDef>Cargo</th>
            <td mat-cell *matCellDef="let r">{{ r.position }}</td>
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
                  matTooltip="Ver detalle del empleado"
                  matTooltipPosition="above"
                  aria-label="Ver detalle del empleado"
                >
                  <mat-icon>visibility</mat-icon>
                </button>
                @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
                  <button
                    mat-icon-button
                    type="button"
                    class="action-btn-edit"
                    (click)="openEdit(r)"
                    matTooltip="Editar empleado"
                    matTooltipPosition="above"
                    aria-label="Editar empleado"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    class="action-btn-delete"
                    (click)="deleteEmployee(r)"
                    matTooltip="Dar de baja (marca como inactivo)"
                    matTooltipPosition="above"
                    aria-label="Dar de baja empleado"
                  >
                    <mat-icon>person_off</mat-icon>
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
      min-width: 880px;
      width: 100%;
    }
  `,
})
export class EmployeesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  rows: EmployeeRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  readonly columns = ['id', 'name', 'identification_number', 'position', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(EmployeeCreateDialogComponent, { width: 'min(96vw, 520px)' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  openView(row: EmployeeRow): void {
    this.dialog.open(EmployeeViewDialogComponent, {
      width: 'min(96vw, 440px)',
      data: row.id,
    });
  }

  openEdit(row: EmployeeRow): void {
    this.dialog
      .open(EmployeeEditDialogComponent, {
        width: 'min(96vw, 520px)',
        data: row.id,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  deleteEmployee(row: EmployeeRow): void {
    if (!confirm(`¿Dar de baja al empleado «${row.name}»? (se marcará como inactivo)`)) {
      return;
    }
    this.api.delete(`/employees/${row.id}`).subscribe({
      next: () => this.load(),
    });
  }

  load(): void {
    this.api
      .get<Paginated<EmployeeRow>>('/employees', { page: this.page, page_size: this.pageSize })
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
