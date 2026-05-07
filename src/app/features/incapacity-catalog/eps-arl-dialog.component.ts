import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { CATALOG_STATUS_OPTIONS, EPS_ARL_KIND_OPTIONS } from '../../shared/searchable-select/select-options';

export interface EpsArlRow {
  id: number;
  kind: string;
  name: string;
  code: string | null;
  status: string;
}

@Component({
  selector: 'em-eps-arl-dialog',
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
      <h2 mat-dialog-title>{{ data?.row ? 'Editar' : 'Nueva' }} EPS / ARL</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <em-searchable-select label="Tipo" [control]="form.controls.kind" [options]="kindOptions" />
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Código (opcional)</mat-label>
            <input matInput formControlName="code" />
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
      min-width: min(100%, 380px);
      padding-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .full {
      width: 100%;
    }
  `,
})
export class EpsArlDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<EpsArlDialogComponent>);
  readonly data = inject<{ row?: EpsArlRow } | undefined>(MAT_DIALOG_DATA, { optional: true });

  readonly kindOptions = EPS_ARL_KIND_OPTIONS;
  readonly statusOptions = CATALOG_STATUS_OPTIONS;
  loading = false;

  readonly form = this.fb.nonNullable.group({
    kind: ['eps', Validators.required],
    name: ['', Validators.required],
    code: [''],
    status: ['active', Validators.required],
  });

  constructor() {
    const r = this.data?.row;
    if (r) {
      this.form.patchValue({
        kind: r.kind,
        name: r.name,
        code: r.code ?? '',
        status: r.status,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    const row = this.data?.row;
    const body = {
      kind: raw.kind,
      name: raw.name,
      code: raw.code.trim() ? raw.code.trim() : null,
      status: row ? raw.status : 'active',
    };
    const req = row ? this.api.patch(`/eps-arl/${row.id}`, body) : this.api.post('/eps-arl', body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
