import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import type { ProfileAlert, ProfileAlertsBundle } from './employee-profile-alerts-panel.component';

interface AlertsListResponse {
  items: ProfileAlertsBundle[];
  total_alerts: number;
  employees_with_alerts: number;
}

@Component({
  selector: 'em-employee-profile-alerts-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Alertas de expedientes</h2>
      <mat-dialog-content>
        @if (loading) {
          <div class="loading"><mat-spinner diameter="36" /></div>
        } @else {
          <p class="summary">
            {{ data?.employees_with_alerts ?? 0 }} colaboradores con alertas ·
            {{ data?.total_alerts ?? 0 }} alertas en total
          </p>
          @if (!data?.items?.length) {
            <p>Sin alertas registradas.</p>
          } @else {
            <div class="list">
              @for (item of data!.items; track item.employee_id) {
                @if (item.alerts.length) {
                  <div class="emp-block">
                    <div class="emp-head">
                      <strong>{{ item.employee_name }}</strong>
                      <span class="doc">{{ item.identification_number }}</span>
                      <a
                        mat-stroked-button
                        color="primary"
                        [routerLink]="['/app/employees', item.employee_id, 'expediente']"
                        mat-dialog-close
                      >
                        Ver expediente
                      </a>
                    </div>
                    <ul>
                      @for (a of item.alerts; track a.code) {
                        <li [class]="'sev--' + a.severity">{{ a.title }}: {{ a.message }}</li>
                      }
                    </ul>
                  </div>
                }
              }
            </div>
          }
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
    .summary {
      margin: 0 0 1rem;
      font-size: 0.88rem;
      color: rgba(10, 10, 10, 0.65);
    }
    .list {
      max-height: 60vh;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .emp-block {
      border: 1px solid rgba(10, 10, 10, 0.1);
      border-radius: 8px;
      padding: 0.75rem;
    }
    .emp-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .doc {
      font-size: 0.82rem;
      color: rgba(10, 10, 10, 0.5);
    }
    ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.82rem;
    }
    li {
      margin-bottom: 0.25rem;
    }
    .sev--critical {
      color: #b00020;
    }
    .sev--warning {
      color: #a67c00;
    }
  `,
})
export class EmployeeProfileAlertsDialogComponent {
  private readonly api = inject(ApiService);
  readonly dialogRef = inject(MatDialogRef<EmployeeProfileAlertsDialogComponent>);

  loading = true;
  data: AlertsListResponse | null = null;

  constructor() {
    this.api.get<AlertsListResponse>('/employees/profile-alerts').subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
