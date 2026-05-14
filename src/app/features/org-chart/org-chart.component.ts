import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { OrgChartShelfHbarDirective } from './org-chart-shelf-hbar.directive';

type OrgChartNodeKind = 'group' | 'user' | 'employee';

interface OrgChartNode {
  kind: OrgChartNodeKind;
  user_id: number | null;
  employee_id: number | null;
  name: string;
  position_label: string;
  area_name: string;
  children: OrgChartNode[];
}

interface OrgChartMember {
  id: number;
  name: string;
  position: string;
  area_name: string;
}

interface OrgChartPayload {
  roots: OrgChartNode[];
  unassigned: OrgChartMember[];
}

@Component({
  selector: 'em-org-chart',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    OrgChartShelfHbarDirective,
  ],
  template: `
    <div class="oc-board">
      <header class="oc-hero">
        <p class="oc-hero-kicker">Organigrama</p>
        <h1 class="oc-hero-brand">Molinos del Atlántico</h1>
        <p class="oc-hero-sub">
          Vista en árbol desde gerencia. Colaboradores del mismo líder se muestran en fila. Use la barra de zoom,
          <strong>Ctrl + rueda del ratón</strong> o arrastre con el botón principal para moverse.
        </p>
      </header>

      <ng-template #branch let-node="node" let-depth="depth">
        @if (node.kind === 'group') {
          <div class="oc-group">
            <div class="oc-group-head">
              <span class="oc-group-kicker">{{ roleUpper(node.position_label) }}</span>
              <span class="oc-group-title">{{ node.name }}</span>
            </div>
            <div class="oc-group-row">
              @for (c of node.children; track trackNode(c)) {
                <div class="oc-spider-arm">
                  <ng-container *ngTemplateOutlet="branch; context: { node: c, depth: depth }" />
                </div>
              }
            </div>
          </div>
        } @else {
          <div
            class="oc-subtree"
            [class.oc-subtree--wide]="node.children && node.children.length > 1"
            [attr.data-depth]="depth"
          >
            <div
              class="oc-node"
              [class.oc-node--root]="depth === 0"
              [class.oc-node--mid]="depth === 1"
              [class.oc-node--leaf]="depth >= 2"
            >
              <div
                class="oc-avatar"
                [class.oc-avatar--sm]="depth >= 1"
                [class.oc-avatar--xs]="depth >= 2"
                [attr.aria-label]="'Avatar ' + node.name"
              >
                <span class="oc-avatar-text">{{ initials(node.name) }}</span>
              </div>
              <p class="oc-role" [class.oc-role--sm]="depth >= 1">{{ roleUpper(node.position_label) }}</p>
              <p class="oc-name" [class.oc-name--sm]="depth >= 1">{{ node.name }}</p>
              @if (node.area_name) {
                <p class="oc-area">{{ node.area_name }}</p>
              }
            </div>

            @if (node.children?.length === 1) {
              <div class="oc-tree oc-tree--single">
                <div class="oc-trunk" [class.oc-trunk--long]="depth === 0"></div>
                <ng-container *ngTemplateOutlet="branch; context: { node: node.children[0], depth: depth + 1 }" />
              </div>
            } @else if (node.children && node.children.length > 1) {
              <div class="oc-tree oc-tree--multi">
                <div class="oc-trunk"></div>
                <div class="oc-shelf">
                  <div class="oc-hbar" aria-hidden="true"></div>
                  <div class="oc-row">
                    @for (c of node.children; track trackNode(c)) {
                      <div class="oc-col">
                        <div class="oc-drop" aria-hidden="true"></div>
                        <ng-container *ngTemplateOutlet="branch; context: { node: c, depth: depth + 1 }" />
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </ng-template>

      @if (loading()) {
        <div class="oc-loading">
          <mat-progress-spinner diameter="44" mode="indeterminate" />
        </div>
      } @else if (error()) {
        <p class="oc-error">{{ error() }}</p>
      } @else if (!data()) {
        <p class="oc-empty">Sin datos.</p>
      } @else {
        @if (!data()!.roots.length) {
          <p class="oc-empty">No hay jerarquía para mostrar (defina gerencia o líderes con equipo).</p>
        } @else {
          <div class="oc-chart-wrap">
            <div class="oc-chart-toolbar">
              <span class="oc-toolbar-hint">Arrastrar para mover · Ctrl + rueda para zoom</span>
              <div class="oc-toolbar-actions">
                <button
                  mat-icon-button
                  type="button"
                  aria-label="Alejar"
                  matTooltip="Alejar"
                  (click)="zoomOut()"
                >
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="oc-zoom-pct">{{ zoomPercent() }}%</span>
                <button
                  mat-icon-button
                  type="button"
                  aria-label="Acercar"
                  matTooltip="Acercar"
                  (click)="zoomIn()"
                >
                  <mat-icon>add</mat-icon>
                </button>
                <button mat-stroked-button type="button" class="oc-reset-btn" (click)="resetView()">
                  Restablecer vista
                </button>
              </div>
            </div>
            <div
              class="oc-viewport"
              [class.oc-viewport--dragging]="viewportDragging()"
              (wheel)="onWheel($event)"
              (pointerdown)="onPointerDown($event)"
              (pointermove)="onPointerMove($event)"
              (pointerup)="onPointerUp($event)"
              (pointercancel)="onPointerUp($event)"
              (lostpointercapture)="onPointerUp($event)"
            >
              <div class="oc-canvas" [style.transform]="canvasTransform()">
                <div class="oc-spider">
                  @for (r of data()!.roots; track trackNode(r)) {
                    <ng-container *ngTemplateOutlet="branch; context: { node: r, depth: 0 }" />
                  }
                </div>
              </div>
            </div>
          </div>
        }

        @if (data()!.unassigned.length) {
          <section class="oc-unassigned">
            <h2 class="oc-unassigned-kicker">Sin líder asignado</h2>
            <p class="oc-unassigned-lead">Colaboradores registrados sin usuario líder</p>
            <div class="oc-unassigned-grid">
              @for (m of data()!.unassigned; track m.id) {
                <div class="oc-node oc-node--secondary oc-node--tile">
                  <div class="oc-avatar oc-avatar--sm" [attr.aria-label]="'Avatar ' + m.name">
                    <span class="oc-avatar-text">{{ initials(m.name) }}</span>
                  </div>
                  <p class="oc-role oc-role--sm">{{ roleUpper(m.position) }}</p>
                  <p class="oc-name oc-name--sm">{{ m.name }}</p>
                  @if (m.area_name) {
                    <p class="oc-area">{{ m.area_name }}</p>
                  }
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .oc-board {
      background: #fafafa;
      margin: -1.15rem -1.35rem 0;
      padding: 2rem 1.5rem 3rem;
      min-height: calc(100vh - 120px);
    }
    .oc-hero {
      max-width: 44rem;
      margin-bottom: 2rem;
    }
    .oc-hero-kicker {
      margin: 0 0 0.15rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #0a0a0a;
    }
    .oc-hero-brand {
      margin: 0 0 0.6rem;
      font-size: clamp(1.65rem, 4vw, 2.35rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0066cc;
      line-height: 1.1;
    }
    .oc-hero-sub {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.55;
      color: rgba(10, 10, 10, 0.55);
      max-width: 40rem;
    }
    .oc-loading,
    .oc-empty {
      display: flex;
      justify-content: center;
      padding: 2.5rem;
      color: rgba(10, 10, 10, 0.55);
    }
    .oc-error {
      color: #b00020;
      padding: 1rem;
    }
    .oc-chart-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      width: 100%;
      max-width: 100%;
    }
    .oc-chart-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.35rem 0.15rem;
    }
    .oc-toolbar-hint {
      font-size: 0.78rem;
      color: rgba(10, 10, 10, 0.55);
    }
    .oc-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }
    .oc-zoom-pct {
      min-width: 3.25rem;
      text-align: center;
      font-size: 0.82rem;
      font-weight: 700;
      color: #103847;
    }
    .oc-reset-btn {
      margin-left: 0.35rem !important;
      font-size: 0.78rem !important;
      min-height: 34px !important;
      padding: 0 0.75rem !important;
    }
    .oc-viewport {
      position: relative;
      height: min(74vh, 860px);
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(16, 56, 71, 0.12);
      background: #e8edf1;
      touch-action: none;
      user-select: none;
      cursor: grab;
    }
    .oc-viewport.oc-viewport--dragging {
      cursor: grabbing;
    }
    .oc-canvas {
      display: inline-block;
      transform-origin: 0 0;
      will-change: transform;
      padding: 2.5rem 3rem 3rem;
    }
    .oc-spider {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: none;
      margin: 0 auto;
    }
    .oc-group {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto 1.5rem;
    }
    .oc-group-head {
      text-align: center;
      margin-bottom: 1.25rem;
    }
    .oc-group-kicker {
      display: block;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #0066cc;
      margin-bottom: 0.25rem;
    }
    .oc-group-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0a0a0a;
    }
    .oc-group-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-start;
      gap: 2rem 2.5rem;
    }
    .oc-spider-arm {
      flex: 0 1 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: min(100%, 14rem);
    }
    .oc-subtree {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: none;
      box-sizing: border-box;
    }
    .oc-subtree--wide {
      width: max-content;
      max-width: none;
      align-self: center;
    }
    .oc-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: max-content;
      max-width: min(22rem, 92vw);
      min-width: 0;
      box-sizing: border-box;
      padding-inline: 0.5rem;
    }
    .oc-node--tile {
      padding: 0.35rem 0.25rem;
    }
    .oc-avatar {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 14px;
      background: linear-gradient(145deg, #eef2f5 0%, #d4dee8 100%);
      border: 2px solid #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
      margin-bottom: 0.6rem;
    }
    .oc-avatar--sm {
      width: 3.55rem;
      height: 3.55rem;
      border-radius: 12px;
      margin-bottom: 0.45rem;
    }
    .oc-avatar--xs {
      width: 3.1rem;
      height: 3.1rem;
      border-radius: 10px;
    }
    .oc-avatar-text {
      font-size: 1.02rem;
      font-weight: 800;
      color: #103847;
    }
    .oc-avatar--sm .oc-avatar-text {
      font-size: 0.9rem;
    }
    .oc-avatar--xs .oc-avatar-text {
      font-size: 0.78rem;
    }
    .oc-role {
      margin: 0 0 0.15rem;
      font-size: 0.74rem;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #0a0a0a;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .oc-role--sm {
      font-size: 0.64rem;
      letter-spacing: 0.055em;
    }
    .oc-name {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 500;
      color: #1a1a1a;
      line-height: 1.3;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .oc-name--sm {
      font-size: 0.82rem;
    }
    .oc-area {
      margin: 0.3rem 0 0;
      font-size: 0.64rem;
      color: rgba(10, 10, 10, 0.48);
      line-height: 1.25;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .oc-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: none;
      box-sizing: border-box;
    }
    .oc-tree--multi {
      width: max-content;
      max-width: none;
    }
    .oc-tree--single {
      align-items: center;
    }
    .oc-trunk {
      width: 3px;
      height: 24px;
      background: #0a0a0a;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .oc-trunk--long {
      height: 34px;
    }
    .oc-shelf {
      position: relative;
      width: max-content;
      max-width: none;
      padding-top: 3px;
      box-sizing: border-box;
    }
    .oc-hbar {
      position: absolute;
      top: 0;
      left: var(--hbar-l, 0px);
      width: var(--hbar-w, 0px);
      height: 3px;
      background: #0a0a0a;
      border-radius: 3px;
      right: auto;
    }
    .oc-row {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: flex-start;
      column-gap: clamp(2.5rem, 4.5vw, 5rem);
      row-gap: 1.5rem;
      padding: 0;
      width: max-content;
      max-width: none;
      box-sizing: border-box;
    }
    .oc-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 0 0 auto;
      width: max-content;
      min-width: 10.5rem;
      max-width: none;
      padding: 0 clamp(0.85rem, 2vw, 1.85rem);
      box-sizing: border-box;
    }
    .oc-drop {
      width: 3px;
      height: 20px;
      background: #0a0a0a;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .oc-unassigned {
      margin-top: 2.25rem;
      padding: 2rem 1rem 0;
      border-top: 1px solid rgba(10, 10, 10, 0.12);
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
    }
    .oc-unassigned-kicker {
      margin: 0 0 0.35rem;
      text-align: center;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #0a0a0a;
    }
    .oc-unassigned-lead {
      margin: 0 0 1.25rem;
      text-align: center;
      font-size: 0.8rem;
      color: rgba(10, 10, 10, 0.5);
    }
    .oc-unassigned-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7.25rem, 1fr));
      gap: 1.15rem 0.85rem;
      justify-items: center;
    }
  `,
})
export class OrgChartComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  private lastPtrX = 0;
  private lastPtrY = 0;
  private activePointerId: number | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<OrgChartPayload | null>(null);

  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly viewportDragging = signal(false);

  readonly canvasTransform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`,
  );
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  ngOnInit(): void {
    this.api.get<OrgChartPayload>('/employees/org-chart').subscribe({
      next: (payload) => {
        this.data.set(payload);
        this.loading.set(false);
        this.resetView();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el organigrama. Verifique su sesión o permisos.');
        this.snack.open('Error al cargar el organigrama', 'Cerrar', { duration: 5000 });
      },
    });
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(2.85, +((z * 1.14) as number).toFixed(3)));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(0.28, +((z / 1.14) as number).toFixed(3)));
  }

  resetView(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  onWheel(e: WheelEvent): void {
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    this.zoom.update((z) => {
      const next = z * (1 + delta * 0.09);
      return Math.min(2.85, Math.max(0.28, +next.toFixed(3)));
    });
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) {
      return;
    }
    const el = e.currentTarget as HTMLElement;
    this.viewportDragging.set(true);
    this.activePointerId = e.pointerId;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;
    el.setPointerCapture(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.viewportDragging() || this.activePointerId !== e.pointerId) {
      return;
    }
    const dx = e.clientX - this.lastPtrX;
    const dy = e.clientY - this.lastPtrY;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;
    this.panX.update((x) => x + dx);
    this.panY.update((y) => y + dy);
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.viewportDragging()) {
      return;
    }
    const el = e.currentTarget as HTMLElement;
    if (this.activePointerId != null) {
      try {
        el.releasePointerCapture(this.activePointerId);
      } catch {
        /* ignore */
      }
    }
    this.viewportDragging.set(false);
    this.activePointerId = null;
  }

  trackNode(n: OrgChartNode): string {
    return `${n.kind}-${n.user_id ?? 'u'}-${n.employee_id ?? 'e'}-${n.name}`;
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return (a + b).toUpperCase();
  }

  roleUpper(label: string): string {
    return (label || '').toUpperCase();
  }
}
