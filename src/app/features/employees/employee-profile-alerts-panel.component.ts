import { Component, Input, OnChanges, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

export interface ProfileAlert {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  due_date?: string | null;
}

export interface ProfileAlertsBundle {
  employee_id: number;
  employee_name: string;
  identification_number: string;
  alerts: ProfileAlert[];
}

type AlertSeverity = ProfileAlert['severity'];

@Component({
  selector: 'em-profile-alerts-panel',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    @if (loading) {
      <mat-spinner class="alerts-spinner" diameter="22" />
    } @else if (alerts.length) {
      <div class="alerts-bar" role="group" aria-label="Alertas del expediente">
        @if (countBySeverity('critical')) {
          <button
            type="button"
            class="alert-chip alert-chip--critical"
            [matTooltip]="tooltipFor('critical')"
            matTooltipClass="profile-alerts-tooltip"
            matTooltipPosition="below"
            [attr.aria-label]="ariaFor('critical')"
          >
            <mat-icon>error</mat-icon>
            <span class="alert-count">{{ countBySeverity('critical') }}</span>
          </button>
        }
        @if (countBySeverity('warning')) {
          <button
            type="button"
            class="alert-chip alert-chip--warning"
            [matTooltip]="tooltipFor('warning')"
            matTooltipClass="profile-alerts-tooltip"
            matTooltipPosition="below"
            [attr.aria-label]="ariaFor('warning')"
          >
            <mat-icon>warning</mat-icon>
            <span class="alert-count">{{ countBySeverity('warning') }}</span>
          </button>
        }
        @if (countBySeverity('info')) {
          <button
            type="button"
            class="alert-chip alert-chip--info"
            [matTooltip]="tooltipFor('info')"
            matTooltipClass="profile-alerts-tooltip"
            matTooltipPosition="below"
            [attr.aria-label]="ariaFor('info')"
          >
            <mat-icon>info</mat-icon>
            <span class="alert-count">{{ countBySeverity('info') }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    .alerts-spinner {
      margin: 0 0.25rem;
    }
    .alerts-bar {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .alert-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.2rem 0.45rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      cursor: default;
      font: inherit;
      line-height: 1;
    }
    .alert-chip mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }
    .alert-count {
      font-size: 0.72rem;
      font-weight: 700;
      min-width: 0.9rem;
      text-align: center;
    }
    .alert-chip--critical {
      color: #b00020;
      background: rgba(176, 0, 32, 0.08);
      border-color: rgba(176, 0, 32, 0.2);
    }
    .alert-chip--warning {
      color: #a67c00;
      background: rgba(166, 124, 0, 0.1);
      border-color: rgba(166, 124, 0, 0.25);
    }
    .alert-chip--info {
      color: #1565c0;
      background: rgba(0, 102, 204, 0.08);
      border-color: rgba(21, 101, 192, 0.2);
    }
  `,
})
export class EmployeeProfileAlertsPanelComponent implements OnChanges {
  private readonly api = inject(ApiService);

  @Input({ required: true }) employeeId!: number;
  @Input() enabled = true;

  loading = false;
  alerts: ProfileAlert[] = [];

  ngOnChanges(): void {
    if (!this.enabled || !this.employeeId) {
      this.alerts = [];
      return;
    }
    this.loading = true;
    this.api.get<ProfileAlertsBundle>(`/employees/${this.employeeId}/profile/alerts`).subscribe({
      next: (b) => {
        this.alerts = b.alerts ?? [];
        this.loading = false;
      },
      error: () => {
        this.alerts = [];
        this.loading = false;
      },
    });
  }

  countBySeverity(severity: AlertSeverity): number {
    return this.alerts.filter((a) => a.severity === severity).length;
  }

  tooltipFor(severity: AlertSeverity): string {
    const items = this.alerts.filter((a) => a.severity === severity);
    const heading = this.severityHeading(severity);
    const lines = items.map((a) => {
      let line = `• ${a.title}: ${a.message}`;
      if (a.due_date) {
        line += ` (vence ${this.formatDueDate(a.due_date)})`;
      }
      return line;
    });
    return [heading, ...lines].join('\n');
  }

  ariaFor(severity: AlertSeverity): string {
    const n = this.countBySeverity(severity);
    const kind =
      severity === 'critical' ? 'críticas' : severity === 'warning' ? 'advertencias' : 'informativas';
    return `${n} alerta${n === 1 ? '' : 's'} ${kind}. Pase el cursor para ver el detalle.`;
  }

  private severityHeading(severity: AlertSeverity): string {
    if (severity === 'critical') return 'Alertas críticas';
    if (severity === 'warning') return 'Advertencias';
    return 'Información';
  }

  private formatDueDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }
}
