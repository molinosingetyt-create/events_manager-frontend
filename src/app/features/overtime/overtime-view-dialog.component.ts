import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

interface UserBrief {
  id: number;
  name: string;
  email: string;
}

interface HistoryEntry {
  id: number;
  request_id: number;
  action: string;
  user_id: number | null;
  user: UserBrief | null;
  comment: string | null;
  snapshot: string | null;
  created_at: string;
}

export interface OvertimeRequestDetail {
  id: number;
  employee_id: number;
  employee_name: string;
  requested_by: number;
  requester: UserBrief;
  date: string;
  hours: string;
  justification: string;
  status: string;
  approved_by: number | null;
  approver: UserBrief | null;
  approval_comment: string | null;
  created_at: string;
  updated_at: string;
  history: HistoryEntry[];
}

@Component({
  selector: 'em-overtime-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Historial de solicitud</h2>
      <mat-dialog-content class="content content-view">
        @if (loading) {
          <div class="loading"><mat-spinner diameter="40" /></div>
        } @else if (error) {
          <p>No se pudo cargar la solicitud.</p>
        } @else if (detail) {
          <div class="hist-root">
            @for (h of detail.history; track h.id) {
              <section class="hist-block">
                @switch (h.action) {
                  @case ('created') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Solicitud creada:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Empleado: {{ detail.employee_name }}</div>
                      <div class="hist-sub-line">Fecha trabajo: {{ lineDate(h) }}</div>
                      <div class="hist-sub-line">Horas:{{ lineHours(h) }}</div>
                      <div class="hist-sub-line">Justificación: {{ detail.justification }}</div>
                    </div>
                  }
                  @case ('approved') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Decisión solicitud:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Comentario de decisión: {{ h.comment || '—' }}</div>
                    </div>
                  }
                  @case ('rejected') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Decisión solicitud:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Comentario de decisión: {{ h.comment || '—' }}</div>
                    </div>
                  }
                  @case ('updated') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Solicitud actualizada:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    @if (h.comment || snapshotLines(h.snapshot).length > 0) {
                      <div class="hist-sub">
                        @if (h.comment) {
                          <div class="hist-sub-line">{{ h.comment }}</div>
                        }
                        @for (line of snapshotLines(h.snapshot); track $index) {
                          <div class="hist-sub-line">{{ line }}</div>
                        }
                      </div>
                    }
                  }
                  @default {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >{{ h.action }}:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    @if (h.comment) {
                      <div class="hist-sub">
                        <div class="hist-sub-line">{{ h.comment }}</div>
                      </div>
                    }
                  }
                }
              </section>
            }
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
    .hist-root {
      text-align: left;
      max-width: 36rem;
      margin: 0 auto;
    }
    .hist-block {
      margin-bottom: 1.35rem;
    }
    .hist-block:last-child {
      margin-bottom: 0;
    }
    .hist-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem 1rem;
      font-size: 0.9375rem;
      line-height: 1.4;
    }
    .hist-head-left {
      flex: 1 1 auto;
      min-width: 0;
    }
    .hist-head-right {
      flex: 0 0 auto;
      font-size: 0.875rem;
      color: var(--em-text-muted, #64748b);
      white-space: nowrap;
    }
    .hist-name {
      font-weight: 600;
    }
    .hist-sub {
      margin-top: 0.45rem;
      padding-left: 1.75rem;
      border-left: 2px solid #e2e8f0;
      margin-left: 0.15rem;
    }
    .hist-sub-line {
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--em-text, #0f172a);
      white-space: pre-wrap;
    }
  `,
})
export class OvertimeViewDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly requestId = inject(MAT_DIALOG_DATA) as number;

  detail: OvertimeRequestDetail | null = null;
  loading = true;
  error = false;

  ngOnInit(): void {
    this.api.get<OvertimeRequestDetail>(`/overtime-requests/${this.requestId}`).subscribe({
      next: (d) => {
        this.detail = d;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  actorName(h: HistoryEntry): string {
    return h.user?.name ?? '—';
  }

  private parseSnapshotObj(snapshot: string | null): Record<string, unknown> | null {
    if (!snapshot) {
      return null;
    }
    try {
      return JSON.parse(snapshot) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  lineDate(h: HistoryEntry): string {
    const o = this.parseSnapshotObj(h.snapshot);
    if (o && o['date'] != null) {
      return String(o['date']);
    }
    return this.detail?.date ?? '';
  }

  lineHours(h: HistoryEntry): string {
    const o = this.parseSnapshotObj(h.snapshot);
    if (o && o['hours'] != null) {
      return String(o['hours']);
    }
    return this.detail?.hours ?? '';
  }

  /** Líneas legibles desde el snapshot JSON (actualizaciones). */
  snapshotLines(snapshot: string | null): string[] {
    const o = this.parseSnapshotObj(snapshot);
    if (!o) {
      return [];
    }
    const lines: string[] = [];
    if (o['employee_id'] != null) {
      lines.push(`Empleado (id): ${String(o['employee_id'])}`);
    }
    if (o['date'] != null) {
      lines.push(`Fecha trabajo: ${String(o['date'])}`);
    }
    if (o['hours'] != null) {
      lines.push(`Horas:${String(o['hours'])}`);
    }
    if (o['status'] != null) {
      lines.push(`Estado: ${String(o['status'])}`);
    }
    return lines;
  }
}
