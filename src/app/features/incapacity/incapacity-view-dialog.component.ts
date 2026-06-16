import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
  employee_identification?: string;
  type: string;
  record_kind?: string;
  temporal_category_id: number;
  temporal_category_name: string;
  eps_arl_id: number | null;
  eps_arl_label: string;
  diagnosis_id: number | null;
  diagnosis_code: string;
  diagnosis_name: string;
  description: string | null;
  support: string | null;
  start_date: string;
  end_date: string | null;
  long_absence_document_kind: string | null;
  file_url: string | null;
  long_absence_second_file_url: string | null;
  long_absence_eps_transcribed_text: string | null;
  created_by: number;
  creator: UserBrief | null;
  status: string;
  created_at: string;
  updated_at: string;
  history: HistoryEntry[];
  extensions?: {
    id: number;
    incapacity_id: number;
    start_date: string;
    end_date: string;
    file_url: string | null;
    note: string | null;
    created_by: number;
    created_at: string;
    updated_at: string;
  }[];
}

@Component({
  selector: 'em-incapacity-view-dialog',
  standalone: true,
  imports: [
    DatePipe,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateLabelPipe,
  ],
  template: `
    <div class="em-dialog">
      <div class="dialog-header">
        <button type="button" mat-dialog-close class="dialog-close-btn" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
        <h2 mat-dialog-title class="dialog-title-centered">Historial de solicitud</h2>
      </div>
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
                      <div class="hist-sub-line">
                        Empleado: {{ detail.employee_name }}
                        @if (detail.employee_identification) {
                          — {{ detail.employee_identification }}
                        }
                      </div>
                      <div class="hist-sub-line">Tipo: {{ detail.type | translateLabel: 'incapacityType' }}</div>
                      <div class="hist-sub-line">Temporal: {{ detail.temporal_category_name }}</div>
                      <div class="hist-sub-line">EPS/ARL: {{ detail.eps_arl_label || '—' }}</div>
                      <div class="hist-sub-line">
                        Diagnóstico:
                        @if (detail.diagnosis_code) {
                          {{ detail.diagnosis_code }} — {{ detail.diagnosis_name }}
                        } @else {
                          —
                        }
                      </div>
                      <div class="hist-sub-line">Inicio: {{ lineStart(h) }}</div>
                      <div class="hist-sub-line">Fin: {{ lineEnd(h) }}</div>
                      @if (detail.description) {
                        <div class="hist-sub-line">Descripción: {{ detail.description }}</div>
                      }
                      <div class="hist-sub-line">
                        <strong>Registro:</strong>
                        {{ detail.record_kind === 'prorroga' ? 'Prórroga' : 'Inicial' }}
                      </div>
                      @if (detail.long_absence_document_kind) {
                        <div class="hist-sub-line">
                          Documentación (3+ días):
                          {{ detail.long_absence_document_kind | translateLabel: 'longAbsenceDocumentKind' }}
                        </div>
                      }
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
                      @if (detail.long_absence_second_file_url) {
                        <div class="hist-sub-line support-img-wrap">
                          <span class="support-img-caption">Soporte adicional (3+ días)</span>
                          <a
                            [href]="assetUrl(detail.long_absence_second_file_url)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="support-img-link"
                          >
                            <img
                              [src]="assetUrl(detail.long_absence_second_file_url)"
                              alt="Soporte adicional"
                              class="support-img"
                            />
                          </a>
                        </div>
                      }
                      @if (detail.long_absence_eps_transcribed_text) {
                        <div class="hist-sub-line hist-text-block">
                          <span class="support-img-caption">Texto transcrito (incapacidad EPS)</span>
                          <p class="eps-transcribed">{{ detail.long_absence_eps_transcribed_text }}</p>
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
                  @case ('extension_added') {
                    <div class="hist-head">
                      <span class="hist-head-left"
                        >Prórroga registrada:
                        <strong class="hist-name">{{ actorName(h) }}</strong></span
                      >
                      <span class="hist-head-right">fecha: {{ h.created_at | date: 'short' }}</span>
                    </div>
                    @if (extensionSnapshot(h.snapshot); as snap) {
                      <div class="hist-sub">
                        <div class="hist-sub-line"><strong>Inicio:</strong> {{ snap.start_date }}</div>
                        <div class="hist-sub-line"><strong>Fin:</strong> {{ snap.end_date }}</div>
                        <div class="hist-sub-line"><strong>Registro:</strong> Prórroga</div>
                        @if (snap.note) {
                          <div class="hist-sub-line"><strong>Comentario:</strong> {{ snap.note }}</div>
                        }
                        @if (snap.file_url) {
                          <div class="hist-sub-line support-img-wrap">
                            <span class="support-img-caption">Soporte (imagen prórroga)</span>
                            <a
                              [href]="assetUrl(snap.file_url)"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="support-img-link"
                            >
                              <img
                                [src]="assetUrl(snap.file_url)"
                                alt="Imagen de la prórroga"
                                class="support-img"
                              />
                            </a>
                          </div>
                        }
                      </div>
                    }
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
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .content-view {
      overflow-x: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
    .dialog-header {
      position: relative;
      padding: 0.35rem 2.75rem 0.65rem;
      text-align: center;
    }
    .dialog-title-centered {
      margin: 0 auto;
      padding: 0 0.5rem;
      max-width: 100%;
      font-size: 1.2rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.35;
      text-align: center;
    }
    .dialog-close-btn {
      position: absolute;
      top: 0.2rem;
      right: 0.15rem;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #103847;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        transform 0.12s ease;
    }
    .dialog-close-btn:hover {
      background: rgba(15, 23, 42, 0.07);
      color: #103847;
    }
    .dialog-close-btn:focus-visible {
      outline: 2px solid var(--em-brand-navy, #0066CC);
      outline-offset: 2px;
    }
    .dialog-close-btn:active {
      transform: scale(0.96);
    }
    .dialog-close-btn mat-icon {
      font-size: 1.35rem;
      width: 1.35rem;
      height: 1.35rem;
      line-height: 1.35rem;
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
      color: var(--em-text-muted, #103847);
      white-space: nowrap;
    }
    .hist-name {
      font-weight: 600;
    }
    .hist-sub {
      margin-top: 0.45rem;
      padding-left: 1.75rem;
      border-left: 2px solid #FCEDD9;
      margin-left: 0.15rem;
    }
    .hist-sub-line {
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--em-text, #103847);
      white-space: pre-wrap;
    }
    .support-img-wrap {
      margin-top: 0.35rem;
    }
    .support-img-caption {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
      color: var(--em-text-muted, #103847);
    }
    .support-img-link {
      display: block;
      max-width: 100%;
    }
    .hist-text-block .eps-transcribed {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .support-img {
      display: block;
      max-width: 100%;
      max-height: 240px;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--em-border, #FCEDD9);
      object-fit: contain;
      background: #FCEDD9;
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
    this.loadDetail();
  }

  private loadDetail(): void {
    this.loading = true;
    this.error = false;
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

  extensionSnapshot(snapshot: string | null): {
    start_date: string;
    end_date: string;
    note: string | null;
    file_url: string | null;
  } | null {
    const o = this.parseSnapshotObj(snapshot);
    if (!o) {
      return null;
    }
    const noteRaw = o['note'];
    const fileRaw = o['file_url'];
    return {
      start_date: String(o['start_date'] ?? ''),
      end_date: String(o['end_date'] ?? ''),
      note: noteRaw != null && String(noteRaw).trim() ? String(noteRaw) : null,
      file_url: fileRaw != null && String(fileRaw).trim() ? String(fileRaw) : null,
    };
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
    if (o['temporal_category_id'] != null) {
      lines.push(`Temporal (id): ${String(o['temporal_category_id'])}`);
    }
    if (o['eps_arl_id'] != null) {
      lines.push(`EPS/ARL (id): ${String(o['eps_arl_id'])}`);
    }
    if (o['diagnosis_id'] != null) {
      lines.push(`Diagnóstico (id): ${String(o['diagnosis_id'])}`);
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
