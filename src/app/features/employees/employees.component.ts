import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { downloadEmployeeTemplate } from '../../core/utils/excel-catalog-templates';
import { importEmployeesExcel } from '../../core/utils/excel-import-runners';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { EmployeeCreateDialogComponent } from './employee-create-dialog.component';
import { EmployeeEditDialogComponent } from './employee-edit-dialog.component';
import { EmployeeViewDialogComponent } from './employee-view-dialog.component';
import { ImportLoadingOverlayComponent } from '../../shared/import-loading-overlay/import-loading-overlay.component';

interface EmployeeRow {
  id: number;
  name: string;
  identification_number: string;
  position: string;
  area_id: number;
  leader_id: number | null;
  temporal_category_id: number | null;
  temporal_category_name: string;
  status: string;
}

@Component({
  selector: 'em-employees',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateLabelPipe,
    ImportLoadingOverlayComponent,
  ],
  template: `
    <em-import-loading-overlay [active]="excelBusy" />
    <div class="page-head">
      <h1>Empleados</h1>
      @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>person_add</mat-icon>
            Nuevo empleado
          </button>
          <button mat-stroked-button type="button" (click)="downloadTemplate()" [disabled]="excelBusy">
            <mat-icon>download</mat-icon>
            Plantilla Excel
          </button>
          <button mat-stroked-button type="button" (click)="triggerImport()" [disabled]="excelBusy">
            <mat-icon>upload_file</mat-icon>
            Importar Excel
          </button>
        </div>
      }
      <p class="page-lead">
        Listado de personal y datos laborales.
      </p>
    </div>
    <div class="search-row">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar empleado</mat-label>
        <mat-icon matPrefix class="search-prefix">search</mat-icon>
        <input
          matInput
          [(ngModel)]="searchText"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Nombre o número de identificación"
          autocomplete="off"
        />
      </mat-form-field>
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
          <ng-container matColumnDef="temporal">
            <th mat-header-cell *matHeaderCellDef>Temporal</th>
            <td mat-cell *matCellDef="let r">{{ r.temporal_category_name || '—' }}</td>
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
    <input
      #employeeFileInput
      type="file"
      class="sr-only"
      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      (change)="onEmployeeFile($event)"
    />
  `,
  styles: `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .search-row {
      margin-bottom: 1rem;
    }
    .search-field {
      width: min(100%, 420px);
    }
    .search-prefix {
      margin-right: 0.25rem;
      color: rgba(0, 0, 0, 0.45);
      vertical-align: middle;
    }
    .full {
      min-width: 960px;
      width: 100%;
    }
  `,
})
export class EmployeesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);

  @ViewChild('employeeFileInput') employeeFileInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'employees')) {
        this.load();
      }
    });
  }

  excelBusy = false;

  rows: EmployeeRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  searchText = '';
  private searchQuery = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  readonly columns = ['id', 'name', 'identification_number', 'position', 'temporal', 'status', 'actions'];

  ngOnInit(): void {
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
    const params: Record<string, string | number> = {
      page: this.page,
      page_size: this.pageSize,
    };
    if (this.searchQuery) {
      params['search'] = this.searchQuery;
    }
    this.api.get<Paginated<EmployeeRow>>('/employees', params).subscribe((res) => {
      this.rows = res.items;
      this.total = res.total;
    });
  }

  onPage(ev: PageEvent): void {
    this.page = ev.pageIndex + 1;
    this.pageSize = ev.pageSize;
    this.load();
  }

  async downloadTemplate(): Promise<void> {
    this.excelBusy = true;
    try {
      await downloadEmployeeTemplate();
    } finally {
      this.excelBusy = false;
    }
  }

  triggerImport(): void {
    setTimeout(() => this.employeeFileInput?.nativeElement.click());
  }

  async onEmployeeFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.excelBusy = true;
    try {
      const summary = await importEmployeesExcel(this.api, file, {
        leaderAssignFromAllUsersInArea: this.auth.hasRole('ADMIN'),
      });
      const msg = `Creados: ${summary.created}. Filas vacías omitidas: ${summary.skipped}.`;
      if (summary.errors.length === 0) {
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
      } else {
        this.snack.open(`${msg} Revise el cuadro de detalle de errores.`, 'Cerrar', { duration: 8000 });
        alert(summary.errors.join('\n'));
      }
      this.load();
    } finally {
      this.excelBusy = false;
    }
  }
}
