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

@Component({
  selector: 'em-shifts-create-dialog',
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
      <h2 mat-dialog-title>Programar turno</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <em-searchable-select label="Empleado" [control]="form.controls.employee_id" [options]="employeeOptions" />
          <em-date-field label="Fecha del turno" [control]="form.controls.shift_date" />
          <div class="time-row">
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Hora inicio</mat-label>
              <input matInput type="time" formControlName="start_time" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Hora fin</mat-label>
              <input matInput type="time" formControlName="end_time" />
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Notas (opcional)</mat-label>
            <textarea matInput rows="2" formControlName="notes"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || loading">Guardar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form { display: flex; flex-direction: column; min-width: min(100%, 420px); padding-top: 0.5rem; }
    .time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .time-field, .full { width: 100%; }
  `,
})
export class ShiftsCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<ShiftsCreateDialogComponent>);
  employeeOptions: SearchableOption<number>[] = [];
  loading = false;
  readonly form = this.fb.group({
    employee_id: [null as number | null, Validators.required],
    shift_date: [null as Date | null, Validators.required],
    start_time: ['06:00', Validators.required],
    end_time: ['14:00', Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.api.getAllPages<{ id: number; name: string }>('/employees').subscribe((items) => {
      this.employeeOptions = items.map((x) => ({ value: x.id, label: x.name }));
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.loading = true;
    this.api
      .post('/shift-schedules', {
        employee_id: v.employee_id,
        shift_date: dateToYmd(v.shift_date),
        start_time: v.start_time,
        end_time: v.end_time,
        notes: v.notes?.trim() || null,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
  }
}
