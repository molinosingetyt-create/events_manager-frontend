import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';

interface AreaRow {
  id: number;
  name: string;
}

interface TemporalRow {
  id: number;
  name: string;
  status: string;
}

interface EmployeeRead {
  id: number;
  name: string;
  identification_number: string;
  position: string;
  area_id: number;
  area_name: string;
  leader_id: number | null;
  leader_name: string | null;
  temporal_category_id: number | null;
  temporal_category_name: string;
  status: string;
}

@Component({
  selector: 'em-employee-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Editar empleado</h2>
      <mat-dialog-content>
      @if (loadError) {
        <p>No se pudo cargar el empleado.</p>
      } @else if (!loaded) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else {
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>N.º identificación</mat-label>
            <input matInput formControlName="identification_number" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Cargo</mat-label>
            <input matInput formControlName="position" />
          </mat-form-field>
          <em-searchable-select
            label="Área"
            [control]="form.controls.area_id"
            [options]="areaOptions"
          />
          <em-searchable-select
            label="Temporal (categoría)"
            [control]="form.controls.temporal_category_id"
            [options]="temporalOptions"
          />
          <em-searchable-select
            label="Líder (usuario)"
            [control]="form.controls.leader_id"
            [options]="leaderOptions"
            [allowNull]="true"
            nullLabel="Sin líder"
          />
          <em-searchable-select
            label="Estado"
            [control]="form.controls.status"
            [options]="statusOptions"
          />
        </form>
      }
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="!loaded || loadError || form.invalid || loading"
        >
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Guardar
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      min-width: min(100%, 400px);
      padding-top: 0.5rem;
    }
    .full {
      width: 100%;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  `,
})
export class EmployeeEditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly ref = inject(MatDialogRef<EmployeeEditDialogComponent>);
  private readonly employeeId = inject(MAT_DIALOG_DATA) as number;

  areaOptions: SearchableOption<number>[] = [];
  temporalOptions: SearchableOption<number>[] = [];
  leaderOptions: SearchableOption<number>[] = [];
  readonly statusOptions = ENTITY_STATUS_OPTIONS;
  loaded = false;
  loadError = false;
  loading = false;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    identification_number: ['', Validators.required],
    position: ['', Validators.required],
    area_id: [0, [Validators.required, Validators.min(1)]],
    temporal_category_id: [0, [Validators.required, Validators.min(1)]],
    leader_id: [null as number | null],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.form.controls.area_id.valueChanges.subscribe((areaId) => {
      if (areaId != null && areaId > 0) {
        this.loadLeadersForArea(areaId, null, null);
      }
    });

    forkJoin({
      areas: this.api.get<Paginated<AreaRow>>('/areas', { page: 1, page_size: 200 }),
      temps: this.api.get<Paginated<TemporalRow>>('/temporal-categories', { page: 1, page_size: 200 }),
      emp: this.api.get<EmployeeRead>(`/employees/${this.employeeId}`),
    }).subscribe({
      next: ({ areas, temps, emp: e }) => {
        this.areaOptions = areas.items.map((a) => ({ value: a.id, label: a.name }));
        let opts = temps.items.map((x) => ({ value: x.id, label: x.name }));
        const tid = e.temporal_category_id;
        if (
          tid != null &&
          tid > 0 &&
          !opts.some((o) => o.value === tid) &&
          e.temporal_category_name
        ) {
          opts = [{ value: tid, label: e.temporal_category_name }, ...opts];
        }
        this.temporalOptions = opts;

        this.form.patchValue(
          {
            name: e.name,
            identification_number: e.identification_number,
            position: e.position,
            area_id: e.area_id,
            temporal_category_id: tid != null && tid > 0 ? tid : 0,
            leader_id: e.leader_id,
            status: e.status,
          },
          { emitEvent: false },
        );
        this.loadLeadersForArea(e.area_id, e.leader_id, e.leader_name);
        this.loaded = true;
      },
      error: () => {
        this.loadError = true;
        this.loaded = true;
      },
    });
  }

  private loadLeadersForArea(
    areaId: number,
    keepLeaderId: number | null | undefined,
    keepLeaderName: string | null | undefined,
  ): void {
    const params: Record<string, string | number> = {};
    if (this.auth.hasRole('ADMIN')) {
      // Admin: listado global (sin area_id); el líder puede ser de otra área que la del empleado.
    } else {
      params['area_id'] = areaId;
      params['role'] = 'LEADER';
    }
    this.api.getAllPages<{ id: number; name: string }>('/users', params).subscribe({
      next: (items) => {
        let opts = items.map((u) => ({ value: u.id, label: u.name }));
        if (
          keepLeaderId != null &&
          keepLeaderId > 0 &&
          !opts.some((o) => o.value === keepLeaderId)
        ) {
          const label =
            (keepLeaderName && keepLeaderName.trim()) || `Usuario #${keepLeaderId}`;
          opts = [{ value: keepLeaderId, label }, ...opts];
        }
        this.leaderOptions = opts;
        const cur = this.form.controls.leader_id.value;
        if (cur != null && cur > 0 && !opts.some((o) => o.value === cur)) {
          this.form.patchValue({ leader_id: null }, { emitEvent: false });
        }
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    const lid = raw.leader_id;
    const body = {
      name: raw.name!,
      identification_number: raw.identification_number!,
      position: raw.position!,
      area_id: raw.area_id!,
      temporal_category_id: raw.temporal_category_id!,
      status: raw.status!,
      leader_id: lid != null && lid > 0 ? lid : null,
    };
    this.api.patch(`/employees/${this.employeeId}`, body).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
