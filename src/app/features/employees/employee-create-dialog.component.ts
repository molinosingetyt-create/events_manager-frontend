import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, Paginated } from '../../core/services/api.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';

interface AreaRow {
  id: number;
  name: string;
}

@Component({
  selector: 'em-employee-create-dialog',
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
      <h2 mat-dialog-title>Nuevo empleado</h2>
      <mat-dialog-content>
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
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || loading">
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Crear
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
  `,
})
export class EmployeeCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<EmployeeCreateDialogComponent>);

  areaOptions: SearchableOption<number>[] = [];
  leaderOptions: SearchableOption<number>[] = [];
  readonly statusOptions = ENTITY_STATUS_OPTIONS;
  loading = false;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    identification_number: ['', Validators.required],
    position: ['', Validators.required],
    area_id: [0, [Validators.required, Validators.min(1)]],
    leader_id: [null as number | null],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.form.controls.area_id.valueChanges.subscribe((areaId) => {
      if (areaId != null && areaId > 0) {
        this.loadLeadersForArea(areaId);
      }
    });

    this.api.get<Paginated<AreaRow>>('/areas', { page: 1, page_size: 200 }).subscribe((r) => {
      this.areaOptions = r.items.map((a) => ({ value: a.id, label: a.name }));
      if (r.items.length) {
        const aid = r.items[0].id;
        this.form.patchValue({ area_id: aid }, { emitEvent: false });
        this.loadLeadersForArea(aid);
      }
    });
  }

  private loadLeadersForArea(areaId: number): void {
    this.api
      .get<Paginated<{ id: number; name: string }>>('/users', {
        page: 1,
        page_size: 200,
        role: 'LEADER',
        area_id: areaId,
      })
      .subscribe((res) => {
        this.leaderOptions = res.items.map((u) => ({ value: u.id, label: u.name }));
        const cur = this.form.controls.leader_id.value;
        if (cur != null && cur > 0 && !this.leaderOptions.some((o) => o.value === cur)) {
          this.form.patchValue({ leader_id: null }, { emitEvent: false });
        }
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
      status: raw.status!,
      leader_id: lid != null && lid > 0 ? lid : null,
    };
    this.api.post('/employees', body).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
