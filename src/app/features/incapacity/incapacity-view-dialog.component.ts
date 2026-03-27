import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { publicAssetUrl } from '../../core/utils/public-asset-url';
import { ApiService } from '../../core/services/api.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

interface UserBrief {
  id: number;
  name: string;
  email: string;
}

interface HistoryEntry {
  id: number;
  incapacity_id: number;
  action: string;
  user_id: number | null;
  user: UserBrief | null;
  comment: string | null;
  snapshot: string | null;
  created_at: string;
}

export interface IncapacityNoteDetail {
  id: number;
  employee_id: number;
  employee_name: string;
  type: string;
  description: string;
  support: string | null;
  start_date: string;
  end_date: string | null;
  file_url: string | null;
  created_by: number;
  creator: UserBrief | null;
  status: string;
  created_at: string;
  updated_at: string;
  history: HistoryEntry[];
}

@Component({
  selector: 'em-incapacity-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslateLabelPipe],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Historial de solicitud</h2>
      <mat-dialog-content class="content content-view">
        @if (loading) {
          <div class="loading"><mat-spinner diameter="40" /></div>
        } @else if (error) {
          <p>No se pudo cargar el registro.</p>
        } @else if (detail) {
          <div class="hist-root">
            @for (h of detail.history; track h.id) {
              <section class="hist-block">
                @switch (h.action) {
                  @case ('created') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Registro creado:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Empleado: {{ detail.employee_name }}</div>
                      <div class="hist-sub-line">Tipo: {{ detail.type | translateLabel: 'incapacityType' }}</div>
                      <div class="hist-sub-line">Inicio: {{ lineStart(h) }}</div>
                      <div class="hist-sub-line">Fin: {{ lineEnd(h) }}</div>
                      <div class="hist-sub-line">Descripción: {{ detail.description }}</div>
                      @if (detail.support) {
                        <div class="hist-sub-line">Soporte (texto): {{ detail.support }}</div>
                      }
                      @if (detail.file_url) {
                        <div class="hist-sub-line support-img-wrap">
                          <span class="support-img-caption">Soporte (imagen)</span>
                          <a
                            [href]="assetUrl(detail.file_url)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="support-img-link"
                          >
                            <img
                              [src]="assetUrl(detail.file_url)"
                              alt="Imagen de soporte"
                              class="support-img"
                            />
                          </a>
                        </div>
                      }
                    </div>
                  }
                  @case ('approved') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Decisión:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Comentario: {{ h.comment || '—' }}</div>
                    </div>
                  }
                  @case ('rejected') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Decisión:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    <div class="hist-sub">
                      <div class="hist-sub-line">Comentario: {{ h.comment || '—' }}</div>
                    </div>
                  }
                  @case ('updated') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Registro actualizado:
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
    .support-img-wrap {
      margin-top: 0.35rem;
    }
    .support-img-caption {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
      color: var(--em-text-muted, #64748b);
    }
    .support-img-link {
      display: block;
      max-width: 100%;
    }
    .support-img {
      display: block;
      max-width: 100%;
      max-height: 240px;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--em-border, #e2e6ef);
      object-fit: contain;
      background: #f8fafc;
    }
  `,
})
export class IncapacityViewDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly noteId = inject(MAT_DIALOG_DATA) as number;

  detail: IncapacityNoteDetail | null = null;
  loading = true;
  error = false;

  assetUrl(path: string | null | undefined): string {
    return publicAssetUrl(path);
  }

  ngOnInit(): void {
    this.api.get<IncapacityNoteDetail>(`/incapacity-notes/${this.noteId}`).subscribe({
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

  lineStart(h: HistoryEntry): string {
    const o = this.parseSnapshotObj(h.snapshot);
    if (o && o['start_date'] != null) {
      return String(o['start_date']);
    }
    return this.detail?.start_date ?? '';
  }

  lineEnd(h: HistoryEntry): string {
    const o = this.parseSnapshotObj(h.snapshot);
    if (o && o['end_date'] != null) {
      return String(o['end_date']);
    }
    return this.detail?.end_date ?? '—';
  }

  snapshotLines(snapshot: string | null): string[] {
    const o = this.parseSnapshotObj(snapshot);
    if (!o) {
      return [];
    }
    const lines: string[] = [];
    if (o['type'] != null) {
      lines.push(`Tipo: ${String(o['type'])}`);
    }
    if (o['start_date'] != null) {
      lines.push(`Inicio: ${String(o['start_date'])}`);
    }
    if (o['end_date'] != null) {
      lines.push(`Fin: ${String(o['end_date'])}`);
    }
    if (o['description'] != null) {
      lines.push(`Descripción: ${String(o['description'])}`);
    }
    if (o['support'] != null) {
      lines.push(`Soporte: ${String(o['support'])}`);
    }
    if (o['status'] != null) {
      lines.push(`Estado: ${String(o['status'])}`);
    }
    if (o['file_url'] != null) {
      lines.push(`Archivo: ${String(o['file_url'])}`);
    }
    return lines;
  }
}
