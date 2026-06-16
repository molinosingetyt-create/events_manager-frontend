import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import type { OrgChartManualNodeDialogData } from './org-chart.types';

@Component({
  selector: 'em-org-chart-manual-node-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Agregar persona' : 'Editar persona' }}</h2>
      <mat-dialog-content>
        <p class="hint">
          Los datos del organigrama manual no modifican el módulo de empleados.
        </p>
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Cargo</mat-label>
            <input matInput formControlName="position_label" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Área / ubicación</mat-label>
            <input matInput formControlName="area_name" />
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        @if (data.mode === 'edit' && data.layoutNodeId != null) {
          <button mat-button type="button" color="warn" (click)="remove()" [disabled]="loading">
            Eliminar
          </button>
        }
        <span class="spacer"></span>
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="form.invalid || loading"
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
    .hint {
      margin: 0 0 1rem;
      font-size: 0.82rem;
      line-height: 1.45;
      color: #444;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(100%, 360px);
    }
    .full {
      width: 100%;
    }
    mat-dialog-actions {
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .spacer {
      flex: 1;
    }
  `,
})
export class OrgChartManualNodeDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<OrgChartManualNodeDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as OrgChartManualNodeDialogData;

  loading = false;

  readonly form = this.fb.group({
    name: [this.data.initial?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    position_label: [this.data.initial?.position_label ?? '', Validators.maxLength(255)],
    area_name: [this.data.initial?.area_name ?? '', Validators.maxLength(255)],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name!.trim(),
      position_label: (raw.position_label ?? '').trim(),
      area_name: (raw.area_name ?? '').trim(),
    };
    this.loading = true;

    if (this.data.mode === 'create') {
      this.api.post('/org-chart/manual/nodes', body)
        .subscribe({
          next: () => this.ref.close(true),
          error: () => (this.loading = false),
          complete: () => (this.loading = false),
        });
      return;
    }

    if (this.data.layoutNodeId != null) {
      this.api.patch(`/org-chart/manual/nodes/${this.data.layoutNodeId}`, body).subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
    } else {
      this.loading = false;
    }
  }

  remove(): void {
    if (this.data.layoutNodeId == null || !confirm('¿Eliminar esta persona y todo su equipo debajo?')) {
      return;
    }
    this.loading = true;
    this.api.delete(`/org-chart/manual/nodes/${this.data.layoutNodeId}`).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
