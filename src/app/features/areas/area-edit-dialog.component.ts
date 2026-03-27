import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';

interface AreaRead {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'em-area-edit-dialog',
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
      <h2 mat-dialog-title>Editar área</h2>
      <mat-dialog-content>
      @if (loadError) {
        <p>No se pudo cargar el área.</p>
      } @else if (!loaded) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else {
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
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
      min-width: min(100%, 360px);
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
export class AreaEditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<AreaEditDialogComponent>);
  private readonly areaId = inject(MAT_DIALOG_DATA) as number;

  readonly statusOptions = ENTITY_STATUS_OPTIONS;
  loaded = false;
  loadError = false;
  loading = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.api.get<AreaRead>(`/areas/${this.areaId}`).subscribe({
      next: (a) => {
        this.form.patchValue({ name: a.name, status: a.status });
        this.loaded = true;
      },
      error: () => {
        this.loadError = true;
        this.loaded = true;
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.api.patch(`/areas/${this.areaId}`, this.form.getRawValue()).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
