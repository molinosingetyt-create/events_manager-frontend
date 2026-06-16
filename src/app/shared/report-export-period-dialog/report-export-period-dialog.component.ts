import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ReportExportPeriodResult {
  dateFrom: string;
  dateTo: string;
}

export interface ReportExportPeriodDialogData {
  title?: string;
  description?: string;
}

@Component({
  selector: 'em-report-export-period-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>{{ title }}</h2>
      <mat-dialog-content>
        <p class="hint">{{ description }}</p>
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Fecha inicio del reporte</mat-label>
            <input matInput type="date" formControlName="date_from" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Fecha fin del reporte</mat-label>
            <input matInput type="date" formControlName="date_to" />
          </mat-form-field>
          @if (form.hasError('invalidRange')) {
            <p class="error">La fecha fin no puede ser anterior a la fecha inicio.</p>
          }
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
          Descargar reporte
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .hint {
      margin: 0 0 1rem;
      font-size: 0.88rem;
      color: rgba(10, 10, 10, 0.65);
      line-height: 1.4;
    }
    .form {
      display: flex;
      flex-direction: column;
      min-width: min(100%, 360px);
    }
    .full {
      width: 100%;
    }
    .error {
      margin: 0;
      font-size: 0.82rem;
      color: #b00020;
    }
  `,
})
export class ReportExportPeriodDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly ref = inject(MatDialogRef<ReportExportPeriodDialogComponent, ReportExportPeriodResult | undefined>);
  private readonly data = inject<ReportExportPeriodDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly title = this.data?.title ?? 'Descargar reporte';
  readonly description =
    this.data?.description ??
    'Indique el periodo de corte. El archivo Excel incluirá solo los registros dentro de ese rango.';

  readonly form = this.fb.group(
    {
      date_from: ['', Validators.required],
      date_to: ['', Validators.required],
    },
    { validators: [exportPeriodRangeValidator] },
  );

  confirm(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.ref.close({ dateFrom: v.date_from!, dateTo: v.date_to! });
  }
}

function exportPeriodRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('date_from')?.value;
  const to = group.get('date_to')?.value;
  if (!from || !to) return null;
  return to < from ? { invalidRange: true } : null;
}
