import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { CATALOG_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';

export interface TemporalCategoryRow {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'em-temporal-category-dialog',
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
      <h2 mat-dialog-title>{{ data?.row ? 'Editar' : 'Nueva' }} categoría temporal</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          @if (data?.row) {
            <em-searchable-select
              label="Estado"
              [control]="form.controls.status"
              [options]="statusOptions"
            />
          }
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || loading">
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
      min-width: min(100%, 360px);
      padding-top: 0.5rem;
    }
    .full {
      width: 100%;
    }
  `,
})
export class TemporalCategoryDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<TemporalCategoryDialogComponent>);
  readonly data = inject<{ row?: TemporalCategoryRow } | undefined>(MAT_DIALOG_DATA, { optional: true });

  readonly statusOptions = CATALOG_STATUS_OPTIONS;
  loading = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    status: ['active', Validators.required],
  });

  constructor() {
    const r = this.data?.row;
    if (r) {
      this.form.patchValue({ name: r.name, status: r.status });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const v = this.form.getRawValue();
    const row = this.data?.row;
    const body = row ? v : { name: v.name, status: 'active' as const };
    const req = row
      ? this.api.patch(`/temporal-categories/${row.id}`, body)
      : this.api.post('/temporal-categories', body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
