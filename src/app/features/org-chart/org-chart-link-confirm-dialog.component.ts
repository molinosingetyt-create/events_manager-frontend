import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface OrgChartLinkConfirmDialogData {
  childName: string;
  childRole: string;
  leaderName: string;
  leaderRole: string;
}

@Component({
  selector: 'em-org-chart-link-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Confirmar relación</h2>
      <mat-dialog-content>
        <p class="hint">¿Desea que esta persona <strong>reporte</strong> al líder seleccionado?</p>
        <div class="box">
          <p class="label">Colaborador</p>
          <p class="name">{{ data.childName }}</p>
          <p class="meta">{{ data.childRole }}</p>
        </div>
        <p class="arrow" aria-hidden="true">↓ reporta a ↓</p>
        <div class="box box--leader">
          <p class="label">Líder</p>
          <p class="name">{{ data.leaderName }}</p>
          <p class="meta">{{ data.leaderRole }}</p>
        </div>
        <p class="note">Puede agregar más líderes después (varios socios, varios jefes, etc.).</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="false">No</button>
        <button mat-flat-button color="primary" type="button" [mat-dialog-close]="true">Sí, crear relación</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .hint {
      margin: 0 0 1rem;
      line-height: 1.45;
    }
    .box {
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      background: #f4f9ff;
      border: 1px solid #b8d4f0;
    }
    .box--leader {
      background: #f8f6ef;
      border-color: #d4c4a8;
    }
    .label {
      margin: 0 0 0.2rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
    }
    .name {
      margin: 0;
      font-weight: 700;
    }
    .meta {
      margin: 0.15rem 0 0;
      font-size: 0.82rem;
      color: #555;
    }
    .arrow {
      text-align: center;
      margin: 0.5rem 0;
      font-size: 0.85rem;
      color: #0066cc;
      font-weight: 600;
    }
    .note {
      margin: 1rem 0 0;
      font-size: 0.8rem;
      color: #555;
    }
  `,
})
export class OrgChartLinkConfirmDialogComponent {
  readonly ref = inject(MatDialogRef<OrgChartLinkConfirmDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA) as OrgChartLinkConfirmDialogData;
}
