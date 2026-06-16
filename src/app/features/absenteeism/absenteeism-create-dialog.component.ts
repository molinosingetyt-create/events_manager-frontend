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
import { ABSENTEEISM_CLASSIFICATION_OPTIONS } from '../../shared/searchable-select/select-options';

@Component({
  selector: 'em-absenteeism-create-dialog',
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
      <h2 mat-dialog-title>Registrar ausentismo</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <em-searchable-select
            label="Empleado"
            [control]="form.controls.employee_id"
            [options]="employeeOptions"
          />
          <em-searchable-select
            label="Clasificación"
            [control]="form.controls.classification"
            [options]="classificationOptions"
          />
          <em-date-field label="Fecha inicio" [control]="form.controls.start_date" />
          <em-date-field label="Fecha fin" [control]="form.controls.end_date" />
          @if (daysCount() > 0) {
            <p class="days-hint"><strong>{{ daysCount() }}</strong> día{{ daysCount() === 1 ? '' : 's' }} de ausencia</p>
          }
          <mat-form-field appearance="outline" class="full">
            <mat-label>Justificación</mat-label>
            <textarea matInput rows="3" formControlName="justification"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || loading || daysCount() <= 0">
          @if (loading) { <mat-spinner diameter="20" /> } @else { Guardar }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form { display: flex; flex-direction: column; min-width: min(100%, 420px); padding-top: 0.5rem; }
    .full { width: 100%; }
    .days-hint { margin: 0.25rem 0 0.75rem; padding: 0.5rem 0.75rem; background: rgba(0,102,204,0.06); border-radius: 8px; font-size: 0.85rem; }
  `,
})
export class AbsenteeismCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<AbsenteeismCreateDialogComponent>);
  employeeOptions: SearchableOption<number>[] = [];
  readonly classificationOptions = ABSENTEEISM_CLASSIFICATION_OPTIONS;
  loading = false;
  readonly form = this.fb.group({
    employee_id: [null as number | null, Validators.required],
    classification: ['paid' as string, Validators.required],
    start_date: [null as Date | null, Validators.required],
    end_date: [null as Date | null, Validators.required],
    justification: ['', Validators.required],
  });

  ngOnInit(): void {
    this.api.getAllPages<{ id: number; name: string }>('/employees').subscribe((items) => {
      this.employeeOptions = items.map((x) => ({ value: x.id, label: x.name }));
    });
  }

  daysCount(): number {
    const s = this.form.controls.start_date.value;
    const e = this.form.controls.end_date.value;
    if (!s || !e) return 0;
    const diff = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  submit(): void {
    if (this.form.invalid || this.daysCount() <= 0) return;
    const v = this.form.getRawValue();
    this.loading = true;
    this.api
      .post('/absenteeism-records', {
        employee_id: v.employee_id,
        classification: v.classification,
        start_date: dateToYmd(v.start_date),
        end_date: dateToYmd(v.end_date),
        justification: v.justification,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
  }
}
