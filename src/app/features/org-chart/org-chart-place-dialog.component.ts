import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import type { OrgChartLayoutNodeRead } from './org-chart.types';

export type OrgChartPlaceDialogResult = 'top' | 'link' | 'leaders' | null;

export interface OrgChartPlaceDialogData {
  node: OrgChartLayoutNodeRead;
  parentCount: number;
}

@Component({
  selector: 'em-org-chart-place-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Ubicar en el organigrama</h2>
      <mat-dialog-content>
        <p class="lead">
          <strong>{{ data.node.name }}</strong>
        </p>
        <p class="role">{{ data.node.position_label || 'Sin cargo' }}</p>
        <p class="hint">Elija cómo desea incluir a esta persona. No modifica el módulo de Empleados.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="start" class="actions">
        <button mat-flat-button color="primary" type="button" [mat-dialog-close]="'top'">
          Nivel superior (sin líder)
        </button>
        <button mat-stroked-button type="button" [mat-dialog-close]="'link'">
          Reporta a alguien del diagrama…
        </button>
        @if (data.parentCount > 0) {
          <button mat-stroked-button type="button" [mat-dialog-close]="'leaders'">
            Gestionar líderes ({{ data.parentCount }})
          </button>
        }
        <button mat-button type="button" [mat-dialog-close]="null">Cancelar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .lead {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .role {
      margin: 0 0 1rem;
      font-size: 0.88rem;
      color: #555;
    }
    .hint {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.45;
      color: #444;
    }
    .actions {
      flex-wrap: wrap;
      gap: 0.35rem;
    }
  `,
})
export class OrgChartPlaceDialogComponent {
  readonly ref = inject(MatDialogRef<OrgChartPlaceDialogComponent, OrgChartPlaceDialogResult>);
  readonly data = inject(MAT_DIALOG_DATA) as OrgChartPlaceDialogData;
}
