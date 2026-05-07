import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { dateToYmd } from '../../core/utils/date-api';
import { DateFieldComponent } from '../../shared/date-field/date-field.component';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';

interface EmployeeOpt {
  id: number;
  name: string;
}

@Component({
  selector: 'em-overtime-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent,
    DateFieldComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Nueva solicitud de horas extra</h2>
      <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <em-searchable-select
          label="Empleado"
          placeholder="Seleccione un empleado"
          [control]="form.controls.employee_id"
          [options]="employeeOptions"
        />
        <em-date-field label="Fecha" [control]="form.controls.date" />
        <mat-form-field appearance="outline" class="full">
          <mat-label>Horas</mat-label>
          <input matInput type="number" step="0.25" min="0.01" formControlName="hours" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Justificación</mat-label>
          <textarea matInput rows="3" formControlName="justification"></textarea>
        </mat-form-field>
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
      min-width: min(100%, 420px);
      padding-top: 0.5rem;
    }
    .full {
      width: 100%;
    }
  `,
})
export class OvertimeCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<OvertimeCreateDialogComponent>);

  employeeOptions: SearchableOption<number>[] = [];
  loading = false;

  readonly form = this.fb.group({
    employee_id: [null as number | null, Validators.required],
    date: [null as Date | null, Validators.required],
    hours: ['', Validators.required],
    justification: ['', Validators.required],
  });

  ngOnInit(): void {
    this.api.getAllPages<EmployeeOpt & { identification_number?: string }>('/employees').subscribe((items) => {
      this.employeeOptions = items.map((x) => ({ value: x.id, label: x.name }));
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.employee_id == null) {
      return;
    }
    const h = parseFloat(String(v.hours));
    if (Number.isNaN(h) || h <= 0) {
      return;
    }
    this.loading = true;
    this.api
      .post('/overtime-requests', {
        employee_id: v.employee_id,
        date: dateToYmd(v.date),
        hours: String(h),
        justification: v.justification,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
  }
}
