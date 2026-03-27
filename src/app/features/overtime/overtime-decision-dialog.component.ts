import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

export interface OvertimeDecisionData {
  requestId: number;
  approve: boolean;
}

@Component({
  selector: 'em-overtime-decision-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>{{ data.approve ? 'Aprobar' : 'Rechazar' }} horas extra</h2>
      <mat-dialog-content>
      <p class="hint">Solo gerencia o administración pueden confirmar esta decisión.</p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Comentario (opcional)</mat-label>
          <textarea matInput rows="3" formControlName="approval_comment"></textarea>
        </mat-form-field>
      </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button [color]="data.approve ? 'primary' : 'warn'" type="button" (click)="submit()" [disabled]="loading">
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Confirmar
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .hint {
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.875rem;
      margin: 0 0 0.5rem;
    }
    .form {
      min-width: min(100%, 360px);
    }
    .full {
      width: 100%;
    }
  `,
})
export class OvertimeDecisionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<OvertimeDecisionDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as OvertimeDecisionData;

  loading = false;

  readonly form = this.fb.nonNullable.group({
    approval_comment: [''],
  });

  submit(): void {
    this.loading = true;
    const c = this.form.getRawValue().approval_comment.trim();
    this.api
      .post(`/overtime-requests/${this.data.requestId}/decision`, {
        approved: this.data.approve,
        approval_comment: c || null,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
  }
}
