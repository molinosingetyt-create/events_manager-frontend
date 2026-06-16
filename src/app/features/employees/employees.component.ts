import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import {
  downloadProfileExportExcel,
  type ProfileExportRowApi,
} from '../../core/utils/employee-profile-export';
import { EmployeeProfileAlertsDialogComponent } from './employee-profile-alerts-dialog.component';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { EmployeeCreateDialogComponent } from './employee-create-dialog.component';
import { EmployeeEditDialogComponent } from './employee-edit-dialog.component';
import { EmployeeViewDialogComponent } from './employee-view-dialog.component';
import { ImportLoadingOverlayComponent } from '../../shared/import-loading-overlay/import-loading-overlay.component';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  COLLABORATOR_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  HIERARCHICAL_LEVEL_OPTIONS,
  LINKAGE_TYPE_OPTIONS,
  WORK_SITE_OPTIONS,
} from './employee-profile-options';

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
    RouterLink,
    ReactiveFormsModule,
    SearchableSelectComponent,
    TranslateLabelPipe,
    ImportLoadingOverlayComponent,
  ],
  template: `
    <em-import-loading-overlay [active]="excelBusy" />
    <div class="page-head">
      <h1>Empleados</h1>
      <div class="actions">
        @if (canManageEmployees()) {
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
        }
        @if (canExportProfiles()) {
          <button mat-stroked-button type="button" (click)="exportProfilesExcel()" [disabled]="excelBusy">
            <mat-icon>table_view</mat-icon>
            Exportar expedientes
          </button>
        }
        @if (canSeeProfileAlerts()) {
          <button mat-stroked-button type="button" (click)="openAlertsDialog()" [disabled]="excelBusy">
            <mat-icon>notifications</mat-icon>
            Alertas expedientes
          </button>
        }
      </div>
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
      <button mat-stroked-button type="button" (click)="showFilters = !showFilters">
        <mat-icon>filter_list</mat-icon>
        Filtros
      </button>
    </div>
    @if (showFilters) {
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-grid">
            <em-searchable-select
              label="Área"
              [control]="filterForm.controls.area_id"
              [options]="areaOptions"
              [allowNull]="true"
              nullLabel="Todas"
            />
            @if (leaderOptions.length) {
              <em-searchable-select
                label="Líder"
                [control]="filterForm.controls.leader_id"
                [options]="leaderOptions"
                [allowNull]="true"
                nullLabel="Todos"
              />
            }
            <em-searchable-select
              label="Estado registro"
              [control]="filterForm.controls.status"
              [options]="statusOptions"
              [allowNull]="true"
              nullLabel="Todos"
            />
            <em-searchable-select
              label="Sede"
              [control]="filterForm.controls.work_site_city"
              [options]="workSiteFilterOptions"
              [allowNull]="true"
              nullLabel="Todas"
            />
            <em-searchable-select
              label="Nivel jerárquico"
              [control]="filterForm.controls.hierarchical_level"
              [options]="levelFilterOptions"
              [allowNull]="true"
              nullLabel="Todos"
            />
            <em-searchable-select
              label="Tipo contrato"
              [control]="filterForm.controls.contract_type"
              [options]="contractFilterOptions"
              [allowNull]="true"
              nullLabel="Todos"
            />
            <em-searchable-select
              label="Estado colaborador"
              [control]="filterForm.controls.collaborator_status"
              [options]="collaboratorFilterOptions"
              [allowNull]="true"
              nullLabel="Todos"
            />
            <em-searchable-select
              label="Vinculación"
              [control]="filterForm.controls.linkage_type"
              [options]="linkageFilterOptions"
              [allowNull]="true"
              nullLabel="Todas"
            />
          </form>
          <div class="filters-actions">
            <button mat-button type="button" (click)="clearFilters()">Limpiar</button>
            <button mat-flat-button color="primary" type="button" (click)="applyFilters()">Aplicar</button>
          </div>
        </mat-card-content>
      </mat-card>
    }
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
                @if (canOpenFullProfile()) {
                  <a
                    mat-icon-button
                    class="action-btn-profile"
                    [routerLink]="['/app/employees', r.id, 'expediente']"
                    matTooltip="Expediente HR completo"
                    matTooltipPosition="above"
                    aria-label="Expediente HR"
                  >
                    <mat-icon>badge</mat-icon>
                  </a>
                }
                @if (canEditEmployees()) {
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
                }
                @if (canDeleteEmployees()) {
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .search-field {
      width: min(100%, 420px);
      flex: 1;
    }
    .filters-card {
      margin-bottom: 1rem;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.25rem 1rem;
    }
    .filters-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.75rem;
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
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  showFilters = false;
  areaOptions: SearchableOption<number>[] = [];
  leaderOptions: SearchableOption<number>[] = [];
  workSiteFilterOptions: SearchableOption<string>[] = [];
  levelFilterOptions: SearchableOption<string>[] = [];
  contractFilterOptions: SearchableOption<string>[] = [];
  collaboratorFilterOptions: SearchableOption<string>[] = [];
  linkageFilterOptions: SearchableOption<string>[] = [];
  readonly statusOptions = ENTITY_STATUS_OPTIONS;

  filterForm = this.fb.group({
    area_id: [null as number | null],
    leader_id: [null as number | null],
    status: [null as string | null],
    work_site_city: [null as string | null],
    hierarchical_level: [null as string | null],
    contract_type: [null as string | null],
    collaborator_status: [null as string | null],
    linkage_type: [null as string | null],
  });

  canManageEmployees(): boolean {
    return this.auth.hasAnyPermission(['employees.create', 'employees.edit']);
  }

  canEditEmployees(): boolean {
    return this.auth.hasPermission('employees.edit');
  }

  canDeleteEmployees(): boolean {
    return this.auth.hasPermission('employees.delete');
  }

  canOpenFullProfile(): boolean {
    return this.auth.hasPermission('employees.profile.full');
  }

  canExportProfiles(): boolean {
    return this.auth.hasPermission('employees.profile.export');
  }

  canSeeProfileAlerts(): boolean {
    return this.auth.hasPermission('employees.profile.alerts');
  }

  @ViewChild('employeeFileInput') employeeFileInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'employees')) {
        this.load();
      }
    });
  }

  excelBusy = false;

  openAlertsDialog(): void {
    this.dialog.open(EmployeeProfileAlertsDialogComponent, { width: '720px', maxWidth: '95vw' });
  }

  exportProfilesExcel(): void {
    this.excelBusy = true;
    this.api
      .get<{ rows: ProfileExportRowApi[] }>('/employees/profile-export', { active_only: true })
      .subscribe({
        next: async (res) => {
          try {
            await downloadProfileExportExcel(res.rows ?? []);
            this.snack.open('Excel de expedientes generado', 'Cerrar', { duration: 3000 });
          } catch {
            this.snack.open('No se pudo generar el Excel', 'Cerrar', { duration: 4000 });
          }
          this.excelBusy = false;
        },
        error: () => {
          this.snack.open('No se pudo exportar expedientes', 'Cerrar', { duration: 4000 });
          this.excelBusy = false;
        },
      });
  }

  rows: EmployeeRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  searchText = '';
  private searchQuery = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  readonly columns = ['id', 'name', 'identification_number', 'position', 'temporal', 'status', 'actions'];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.load();
  }

  private loadFilterOptions(): void {
    this.api
      .get<{
        areas: { id: number; name: string }[];
        leaders: { id: number; name: string }[];
        work_site_cities: string[];
        hierarchical_levels: string[];
        contract_types: string[];
        collaborator_statuses: string[];
        linkage_types: string[];
      }>('/employees/filter-options')
      .subscribe({
        next: (o) => {
          this.areaOptions = o.areas.map((a) => ({ value: a.id, label: a.name }));
          this.leaderOptions = o.leaders.map((l) => ({ value: l.id, label: l.name }));
          this.workSiteFilterOptions = this.toOptions(o.work_site_cities, WORK_SITE_OPTIONS);
          this.levelFilterOptions = this.toOptions(o.hierarchical_levels, HIERARCHICAL_LEVEL_OPTIONS);
          this.contractFilterOptions = this.toOptions(o.contract_types, CONTRACT_TYPE_OPTIONS);
          this.collaboratorFilterOptions = this.toOptions(
            o.collaborator_statuses,
            COLLABORATOR_STATUS_OPTIONS,
          );
          this.linkageFilterOptions = this.toOptions(o.linkage_types, LINKAGE_TYPE_OPTIONS);
        },
      });
  }

  private toOptions(values: string[], catalog: SearchableOption<string>[]): SearchableOption<string>[] {
    const labels = new Map(catalog.map((c) => [c.value, c.label]));
    return values.map((v) => ({ value: v, label: labels.get(v) ?? v }));
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.page = 1;
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
    const f = this.filterForm.getRawValue();
    if (f.area_id != null) params['area_id'] = f.area_id;
    if (f.leader_id != null) params['leader_id'] = f.leader_id;
    if (f.status) params['status'] = f.status;
    if (f.work_site_city) params['work_site_city'] = f.work_site_city;
    if (f.hierarchical_level) params['hierarchical_level'] = f.hierarchical_level;
    if (f.contract_type) params['contract_type'] = f.contract_type;
    if (f.collaborator_status) params['collaborator_status'] = f.collaborator_status;
    if (f.linkage_type) params['linkage_type'] = f.linkage_type;
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
        leaderAssignFromAllUsersInArea: this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGEMENT']),
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
