import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

interface AreaViewData {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'em-area-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, TranslateLabelPipe],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Detalle del área</h2>
      <mat-dialog-content class="content content-view">
        <div class="detail-lines">
          <p class="detail-line">
            <span class="detail-label">ID:</span>
            <span class="detail-value">{{ data.id }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Nombre:</span>
            <span class="detail-value">{{ data.name }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Estado:</span>
            <span class="detail-value">{{ data.status | translateLabel: 'entityStatus' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Creado:</span>
            <span class="detail-value">{{ data.created_at | date: 'short' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Actualizado:</span>
            <span class="detail-value">{{ data.updated_at | date: 'short' }}</span>
          </p>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button color="warn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [],
})
export class AreaViewDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as AreaViewData;
}
