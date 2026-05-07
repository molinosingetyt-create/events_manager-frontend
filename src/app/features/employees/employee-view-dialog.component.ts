import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

interface EmployeeRead {
  id: number;
  name: string;
  identification_number: string;
  position: string;
  area_id: number;
  area_name: string;
  leader_id: number | null;
  leader_name: string | null;
  temporal_category_id: number | null;
  temporal_category_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'em-employee-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslateLabelPipe],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Detalle del empleado</h2>
      <mat-dialog-content class="content content-view">
      @if (!loaded && !error) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else if (error) {
        <p>No se pudo cargar el empleado.</p>
      } @else if (emp) {
        <div class="detail-lines">
          <p class="detail-line">
            <span class="detail-label">ID:</span>
            <span class="detail-value">{{ emp.id }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Nombre:</span>
            <span class="detail-value">{{ emp.name }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">N.º identificación:</span>
            <span class="detail-value">{{ emp.identification_number }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Cargo:</span>
            <span class="detail-value">{{ emp.position }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Área:</span>
            <span class="detail-value">{{ emp.area_name || ('#' + emp.area_id) }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Temporal:</span>
            <span class="detail-value">{{ emp.temporal_category_name || '—' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Líder:</span>
            <span class="detail-value">{{ emp.leader_name || (emp.leader_id != null ? '#' + emp.leader_id : '—') }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Estado:</span>
            <span class="detail-value">{{ emp.status | translateLabel: 'entityStatus' }}</span>
          </p>
          <p class="detail-line">
            <span class="detail-label">Actualizado:</span>
            <span class="detail-value">{{ emp.updated_at | date: 'short' }}</span>
          </p>
        </div>
      }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button color="warn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  `,
})
export class EmployeeViewDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly id = inject(MAT_DIALOG_DATA) as number;

  emp: EmployeeRead | null = null;
  loaded = false;
  error = false;

  ngOnInit(): void {
    this.api.get<EmployeeRead>(`/employees/${this.id}`).subscribe({
      next: (e) => {
        this.emp = e;
        this.loaded = true;
      },
      error: () => {
        this.error = true;
        this.loaded = true;
      },
    });
  }
}
