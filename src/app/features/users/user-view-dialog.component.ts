import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { User } from '../../core/models/user';
import { ApiService } from '../../core/services/api.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

interface AreaRead {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'em-user-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslateLabelPipe],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Detalle del usuario</h2>
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
            <span class="detail-label">Correo:</span>
            <span class="detail-value">{{ data.email }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Rol:</span>
            <span class="detail-value">{{ data.role | translateLabel: 'role' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Área:</span>
            <span class="detail-value">
              @if (areaLoading) {
                <mat-spinner diameter="22" />
              } @else if (areaName) {
                {{ areaName }}
              } @else {
                <span class="muted">{{ areaError ? 'No se pudo cargar el área' : '—' }}</span>
              }
            </span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Estado:</span>
            <span class="detail-value">{{ data.status | translateLabel: 'entityStatus' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Creado:</span>
            <span class="detail-value">{{ data.created_at | date: 'short' }}</span>
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
export class UserViewDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly data = inject(MAT_DIALOG_DATA) as User;

  areaName: string | null = null;
  areaLoading = true;
  areaError = false;

  ngOnInit(): void {
    this.api.get<AreaRead>(`/areas/${this.data.area_id}`).subscribe({
      next: (a) => {
        this.areaName = a.name;
        this.areaLoading = false;
      },
      error: () => {
        this.areaError = true;
        this.areaLoading = false;
      },
    });
  }
}
