import {
  CDK_DRAG_CONFIG,
  CdkDrag,
  CdkDragPreview,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { OrgChartLinkConfirmDialogComponent } from './org-chart-link-confirm-dialog.component';
import { OrgChartManualLeadersDialogComponent } from './org-chart-manual-leaders-dialog.component';
import { OrgChartManualNodeDialogComponent } from './org-chart-manual-node-dialog.component';
import {
  OrgChartPlaceDialogComponent,
  type OrgChartPlaceDialogResult,
} from './org-chart-place-dialog.component';
import { OrgChartReassignDialogComponent } from './org-chart-reassign-dialog.component';
import {
  type ManualGraphState,
  isNodeOnChart,
  manualDragPayload,
  nodeLabelById,
  parentIdsFor,
  pendingPoolNodes,
} from './org-chart-manual.graph';
import { OrgChartShelfHbarDirective } from './org-chart-shelf-hbar.directive';
import type {
  OrgChartLayoutNodeRead,
  OrgChartManualNodeDialogData,
  OrgChartMember,
  OrgChartNode,
  OrgChartPayload,
  OrgChartReassignTarget,
  OrgChartViewMode,
  ManualOrgChartPayload,
} from './org-chart.types';
import {
  collectOrgChartPeople,
  personMatchesQuery,
  trackKeyForMember,
  trackKeyForNode,
  type OrgChartPersonRef,
} from './org-chart.utils';

@Component({
  selector: 'em-org-chart',
  standalone: true,
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: { previewContainer: 'global' } }],
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    DragDropModule,
    CdkDrag,
    CdkDragPreview,
    OrgChartShelfHbarDirective,
  ],
  template: `
    <div class="oc-board">
      <header class="oc-hero">
        <p class="oc-hero-kicker">Organigrama</p>
        <h1 class="oc-hero-brand">Molinos del Atlántico</h1>
        @if (viewMode() === 'manual') {
          <p class="oc-hero-sub">
            Base: <strong>todos los empleados</strong> del sistema. <strong>Haga clic</strong> en un nombre de la lista,
            elija cómo ubicarlo y luego conecte líderes en el diagrama (varios líderes por persona). No modifica
            Empleados. Zoom: <strong>Ctrl + rueda</strong>.
          </p>
        } @else {
          <p class="oc-hero-sub">
            Vista de referencia desde <strong>Empleados</strong> (líder asignado en cada ficha). No edita el
            organigrama manual. Zoom: <strong>Ctrl + rueda</strong>; arrastre para mover el lienzo.
          </p>
        }
        <div class="oc-mode-bar">
          <button
            mat-stroked-button
            type="button"
            [class.oc-mode-btn--active]="viewMode() === 'manual'"
            (click)="setViewMode('manual')"
          >
            Organigrama manual
          </button>
          <button
            mat-stroked-button
            type="button"
            [class.oc-mode-btn--active]="viewMode() === 'employees'"
            (click)="setViewMode('employees')"
          >
            Desde empleados
          </button>
        </div>
        <div class="oc-search-bar">
          <mat-form-field appearance="outline" class="oc-search-field">
            <mat-label>Buscar por nombre o cargo</mat-label>
            <input
              matInput
              type="search"
              [(ngModel)]="searchText"
              (ngModelChange)="onSearchChange()"
              placeholder="Ej. García, coordinador…"
            />
            @if (searchText) {
              <button
                mat-icon-button
                matSuffix
                type="button"
                aria-label="Limpiar búsqueda"
                (click)="clearSearch()"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
          @if (searchActive()) {
            @if (searchResults().length === 0) {
              <p class="oc-search-empty">Sin coincidencias</p>
            } @else if (searchResults().length === 1) {
              <span class="oc-search-count">
                1 coincidencia —
                @if (viewMode() === 'manual') {
                  centrando en el organigrama o la lista…
                } @else {
                  ubicando en el organigrama…
                }
              </span>
            } @else {
              <div class="oc-search-picks">
                <p class="oc-search-picks-title">
                  {{ searchResults().length }} coincidencias —
                  @if (viewMode() === 'manual') {
                    elija para ir al diagrama o a «Por ubicar»:
                  } @else {
                    elija para ubicar en el organigrama:
                  }
                </p>
                <div class="oc-search-picks-list" role="listbox" aria-label="Coincidencias de búsqueda">
                  @for (r of searchResults(); track r.key) {
                    <button
                      type="button"
                      class="oc-search-pick"
                      role="option"
                      [class.oc-search-pick--active]="focusedKey() === r.key"
                      [attr.aria-selected]="focusedKey() === r.key"
                      (click)="focusPerson(r.key)"
                    >
                      <span class="oc-search-pick-name">{{ r.name }}</span>
                      <span class="oc-search-pick-meta">{{ r.position }}@if (r.areaName) { · {{ r.areaName }} }</span>
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>
      </header>

      <ng-template
        #branch
        let-node="node"
        let-depth="depth"
        let-shelfLeader="shelfLeader"
        let-shelfUnderParent="shelfUnderParent"
      >
        @if (node.kind === 'leader_shelf') {
          <div class="oc-leader-shelf" [attr.data-depth]="depth">
            <div class="oc-multi-shelves">
              <div class="oc-shelf oc-shelf--leaders">
                <div class="oc-connector-band oc-connector-band--leaders">
                  @if (shelfUnderParent) {
                    <div class="oc-hbar oc-hbar--boss-in" aria-hidden="true"></div>
                  }
                  <div class="oc-row">
                    @for (leader of node.leaders ?? []; track trackNode(leader)) {
                      <div class="oc-col">
                        @if (shelfUnderParent) {
                          <div class="oc-drop oc-drop--from-boss" aria-hidden="true"></div>
                        } @else {
                          <div class="oc-drop oc-drop--peer-up" aria-hidden="true"></div>
                        }
                        <ng-container
                          *ngTemplateOutlet="
                            branch;
                            context: { node: leader, depth: depth, shelfLeader: true }
                          "
                        />
                        @if (node.children?.length) {
                          <div class="oc-vstem" aria-hidden="true"></div>
                        }
                      </div>
                    }
                  </div>
                  @if (node.children?.length) {
                    <div class="oc-hbar oc-hbar--leaders-out" aria-hidden="true"></div>
                  }
                </div>
              </div>
              @if (node.children?.length) {
                <div class="oc-link-join oc-link-join--shelf-bridge" aria-hidden="true"></div>
                <div class="oc-shelf">
                  <div
                    class="oc-link-down oc-link-down--from-shelf"
                    [class.oc-link-down--root]="depth === 0"
                    aria-hidden="true"
                  ></div>
                  <div class="oc-connector-band">
                    <div class="oc-hbar" aria-hidden="true"></div>
                    <div class="oc-row">
                      @for (c of node.children; track trackNode(c)) {
                        <div class="oc-col">
                          <div class="oc-drop" aria-hidden="true"></div>
                          <ng-container
                            *ngTemplateOutlet="branch; context: { node: c, depth: depth + 1 }"
                          />
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else if (node.kind === 'group') {
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
              [attr.data-oc-key]="node.kind === 'group' ? null : trackKeyForNode(node)"
              [attr.data-layout-node-id]="node.layout_node_id ?? null"
              [class.oc-node--root]="depth === 0"
              [class.oc-node--mid]="depth === 1"
              [class.oc-node--leaf]="depth >= 2"
              [class.oc-node--match]="nodeMatchesSearch(node)"
              [class.oc-node--dim]="nodeDimmed(node)"
              [class.oc-node--focused]="focusedKey() === trackKeyForNode(node)"
              [class.oc-node--link-target]="linkMode() && canPickAsLeader(node)"
              (click)="onChartNodeClick(node, $event)"
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
              @if (viewMode() === 'manual' && node.layout_node_id != null && manualParentIds(node.layout_node_id).length) {
                <p class="oc-reports">
                  Reporta a:
                  @for (pid of manualParentIds(node.layout_node_id); track pid) {
                    <span class="oc-report-chip">{{ manualNodeLabel(pid) }}</span>
                  }
                </p>
              }
              @if (canEditManualNode(node)) {
                <div
                  class="oc-node-drag"
                  cdkDrag
                  cdkDragPreviewContainer="global"
                  [cdkDragData]="manualDragPayload(node)"
                  matTooltip="Arrastrar hacia otro líder"
                  (cdkDragStarted)="onCdkDragStarted()"
                  (cdkDragEnded)="onCdkDragEnded()"
                  (click)="$event.stopPropagation()"
                >
                  <ng-template cdkDragPreview>
                    <div class="oc-drag-preview-card">
                      <span class="oc-drag-preview-name">{{ node.name }}</span>
                      <span class="oc-drag-preview-role">{{ roleUpper(node.position_label) }}</span>
                    </div>
                  </ng-template>
                  <mat-icon>drag_indicator</mat-icon>
                </div>
                <div class="oc-node-actions">
                  <button
                    mat-icon-button
                    type="button"
                    class="oc-node-action"
                    matTooltip="Líderes (puede ser varios)"
                    aria-label="Gestionar líderes"
                    (click)="openManualLeadersForNode(node, $event)"
                  >
                    <mat-icon>account_tree</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    class="oc-node-action"
                    matTooltip="Editar texto en organigrama"
                    aria-label="Editar"
                    (click)="openEditManualNode(node, $event)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                </div>
              } @else if (canReassignNode(node)) {
                <button
                  mat-icon-button
                  type="button"
                  class="oc-node-action"
                  matTooltip="Cambiar líder"
                  aria-label="Cambiar líder"
                  (click)="openReassignForNode(node, $event)"
                >
                  <mat-icon>swap_horiz</mat-icon>
                </button>
              }
            </div>
            @if (node.children?.length) {
              @if (shelfLeader) {
                <div class="oc-leader-local">
                  @for (c of node.children; track trackNode(c)) {
                    <ng-container
                      *ngTemplateOutlet="branch; context: { node: c, depth: depth + 1 }"
                    />
                  }
                </div>
              } @else {
              <div class="oc-tree" [class.oc-tree--one]="node.children.length === 1">
                <div class="oc-multi-shelves">
                  @for (peerRow of peerShelves(node.children); track peerRowTrack(peerRow, $index)) {
                    @if (rowIsLeaderShelf(peerRow)) {
                      <div class="oc-shelf oc-shelf--under-boss">
                        @if ($index === 0) {
                          <div
                            class="oc-link-down"
                            [class.oc-link-down--root]="depth === 0"
                            aria-hidden="true"
                          ></div>
                        } @else {
                          <div class="oc-link-join" aria-hidden="true"></div>
                        }
                        <ng-container
                          *ngTemplateOutlet="
                            branch;
                            context: {
                              node: peerRow[0],
                              depth: depth + 1,
                              shelfUnderParent: true,
                            }
                          "
                        />
                      </div>
                    } @else {
                      <div class="oc-shelf">
                        @if ($index === 0) {
                          <div
                            class="oc-link-down"
                            [class.oc-link-down--root]="depth === 0"
                            aria-hidden="true"
                          ></div>
                        } @else {
                          <div class="oc-link-join" aria-hidden="true"></div>
                        }
                        <div class="oc-connector-band">
                          <div class="oc-hbar" aria-hidden="true"></div>
                          <div class="oc-row">
                            @for (c of peerRow; track trackNode(c)) {
                              <div class="oc-col" [class.oc-col--has-shelf]="c.kind === 'leader_shelf'">
                                @if (c.kind !== 'leader_shelf') {
                                  <div class="oc-drop" aria-hidden="true"></div>
                                }
                                <ng-container
                                  *ngTemplateOutlet="
                                    branch;
                                    context: { node: c, depth: depth + 1 }
                                  "
                                />
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
              }
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
        <div class="oc-body" [class.oc-body--manual]="viewMode() === 'manual'">
          @if (viewMode() === 'manual' && manualGraph()) {
            <aside class="oc-pool">
              <h2 class="oc-pool-title">
                Por ubicar ({{ manualPoolPending().length }}@if (manualPoolTotal() > manualPoolPending().length) {
                  <span class="oc-pool-total"> / {{ manualPoolTotal() }}</span>
                })
              </h2>
              <p class="oc-pool-hint">
                Solo aparecen quienes <strong>aún no están</strong> en el diagrama. Para agregar otro líder a alguien
                ya ubicado, use <mat-icon class="oc-pool-icon-inline">account_tree</mat-icon> en su tarjeta.
              </p>
              <div class="oc-pool-scroll">
                @if (!manualPoolFiltered().length) {
                  <p class="oc-pool-empty">Todos los empleados ya están en el organigrama.</p>
                } @else {
                <div class="oc-pool-list">
                  @for (n of manualPoolFiltered(); track n.id) {
                    <button
                      type="button"
                      class="oc-pool-chip"
                      [attr.data-oc-key]="'manual-' + n.id"
                      [class.oc-pool-chip--match]="poolChipMatchesSearch(n)"
                      [class.oc-pool-chip--selected]="selectedPoolNode()?.id === n.id"
                      [disabled]="!canEditManual()"
                      (click)="onPoolChipClick(n)"
                    >
                      <mat-icon class="oc-pool-pick">touch_app</mat-icon>
                      <span class="oc-pool-name">{{ n.name }}</span>
                      <span class="oc-pool-meta">{{ roleUpper(n.position_label) }}</span>
                    </button>
                  }
                </div>
                }
              </div>
            </aside>
          }
          <div class="oc-main">
            @if (linkMode() && selectedPoolNode(); as sel) {
              <div class="oc-link-banner" role="status">
                <mat-icon>link</mat-icon>
                <span>
                  Elija en el diagrama a quién reporta <strong>{{ sel.name }}</strong> (se pedirá confirmación).
                </span>
                <button mat-stroked-button type="button" (click)="cancelLinkMode()">Cancelar</button>
              </div>
            }
            @if (viewMode() === 'manual' && !data()!.roots.length && !linkMode()) {
              <p class="oc-empty oc-empty--inline">
                Haga <strong>clic</strong> en un empleado de la lista y elija «Nivel superior» o «Reporta a alguien» para
                comenzar el organigrama.
              </p>
            } @else if (viewMode() !== 'manual' && !data()!.roots.length) {
              <p class="oc-empty oc-empty--inline">
                No hay jerarquía para mostrar (defina gerencia o líderes con equipo).
              </p>
            }
            <div class="oc-chart-wrap">
            <div class="oc-chart-toolbar">
              <span class="oc-toolbar-hint">Clic en empleado (lista) · Clic en líder (diagrama) · Ctrl + rueda zoom</span>
              @if (viewMode() === 'manual' && canEditManual()) {
                <div class="oc-toolbar-manual">
                  <button mat-stroked-button type="button" (click)="resetManualLayout()">
                    Limpiar relaciones
                  </button>
                </div>
              }
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
                <button mat-stroked-button type="button" class="oc-reset-btn" (click)="fitChartToViewport()">
                  Centrar organigrama
                </button>
              </div>
            </div>
            <div
              #chartViewport
              class="oc-viewport"
              [class.oc-viewport--dragging]="viewportDragging()"
              [class.oc-viewport--employee-drag]="employeeDragging()"
              (wheel)="onWheel($event)"
              (pointerdown)="onPointerDown($event)"
              (pointermove)="onPointerMove($event)"
              (pointerup)="onPointerUp($event)"
              (pointercancel)="onPointerUp($event)"
              (lostpointercapture)="onPointerUp($event)"
            >
              <div class="oc-canvas" [style.transform]="canvasTransform()">
                @if (viewMode() === 'manual' && canEditManual() && selectedPoolNode()) {
                  <div class="oc-root-actions">
                    <button mat-stroked-button type="button" (click)="placeSelectedAtTop()">
                      Colocar «{{ selectedPoolNode()!.name }}» en nivel superior
                    </button>
                  </div>
                }
                <div class="oc-spider">
                  @for (r of data()!.roots; track trackNode(r)) {
                    <ng-container *ngTemplateOutlet="branch; context: { node: r, depth: 0 }" />
                  }
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        @if (viewMode() === 'employees' && data()!.unassigned.length) {
          <section class="oc-unassigned">
            <h2 class="oc-unassigned-kicker">Sin líder asignado</h2>
            <p class="oc-unassigned-lead">
              Colaboradores registrados sin usuario líder. Orden: Socios → Gerencia → demás. Máximo
              {{ maxPeersPerRow }} por fila; el resto continúa debajo del mismo bloque.
            </p>
            @for (block of unassignedSections(); track block.key) {
              <div class="oc-unassigned-block">
                <h3 class="oc-unassigned-block-title">{{ block.title }}</h3>
                @for (row of chunkMembers(block.items); track rowTrack(row, $index)) {
                  <div class="oc-unassigned-row">
                    @for (m of row; track m.id) {
                      <div
                        class="oc-node oc-node--secondary oc-node--tile"
                        [attr.data-oc-key]="trackKeyForMember(m)"
                        [class.oc-node--match]="memberMatchesSearch(m)"
                        [class.oc-node--dim]="memberDimmed(m)"
                        [class.oc-node--focused]="focusedKey() === trackKeyForMember(m)"
                      >
                        <div class="oc-avatar oc-avatar--sm" [attr.aria-label]="'Avatar ' + m.name">
                          <span class="oc-avatar-text">{{ initials(m.name) }}</span>
                        </div>
                        <p class="oc-role oc-role--sm">{{ roleUpper(m.position) }}</p>
                        <p class="oc-name oc-name--sm">{{ m.name }}</p>
                        @if (m.area_name) {
                          <p class="oc-area">{{ m.area_name }}</p>
                        }
                        @if (canReassignEmployees) {
                          <button
                            mat-icon-button
                            type="button"
                            class="oc-node-action"
                            matTooltip="Cambiar líder"
                            aria-label="Cambiar líder"
                            (click)="openReassignForMember(m, $event)"
                          >
                            <mat-icon>swap_horiz</mat-icon>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
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
      overflow: visible;
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
      background-color: #e8edf1;
      background-image:
        linear-gradient(rgba(16, 56, 71, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 56, 71, 0.07) 1px, transparent 1px);
      background-size: 22px 22px;
      touch-action: none;
      user-select: none;
      cursor: grab;
    }
    .oc-viewport.oc-viewport--dragging {
      cursor: grabbing;
    }
    .oc-canvas {
      position: relative;
      display: inline-block;
      transform-origin: 0 0;
      will-change: transform;
      padding: 1.75rem 2rem 2.25rem;
    }
    .oc-spider {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: none;
      margin: 0 auto;
    }
    .oc-leader-shelf {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: none;
      margin: 0 auto 0.5rem;
    }
    .oc-leader-shelf > .oc-multi-shelves {
      align-items: center;
      gap: 0;
    }
    .oc-link-join--shelf-bridge {
      height: 28px;
      min-height: 18px;
    }
    .oc-shelf--leaders .oc-connector-band--leaders {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }
    .oc-shelf--leaders .oc-connector-band--leaders {
      position: relative;
    }
    .oc-shelf--leaders .oc-connector-band--leaders > .oc-row {
      padding-top: 4px;
      padding-bottom: 2px;
      width: 100%;
      justify-content: center;
    }
    .oc-shelf--leaders .oc-connector-band--leaders > .oc-hbar--boss-in {
      position: absolute;
      top: var(--hbar-t, 0px);
      left: var(--hbar-l);
      width: var(--hbar-w);
      min-width: 4px;
      height: 4px;
      pointer-events: none;
    }
    .oc-shelf--leaders .oc-connector-band--leaders > .oc-row:has(.oc-drop--from-boss) {
      padding-top: 30px;
    }
    .oc-shelf--leaders .oc-connector-band--leaders > .oc-row:has(.oc-drop--peer-up) {
      padding-top: 4px;
    }
    .oc-shelf--leaders .oc-connector-band--leaders > .oc-hbar--leaders-out {
      position: relative;
      top: auto;
      left: var(--hbar-l);
      width: var(--hbar-w);
      min-width: 4px;
      margin-top: 0;
      flex-shrink: 0;
    }
    .oc-shelf--leaders .oc-col {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .oc-shelf--leaders .oc-col > .oc-subtree {
      margin-bottom: 0;
    }
    .oc-vstem {
      width: 4px;
      min-width: 4px;
      height: 26px;
      min-height: 18px;
      margin: 0 auto;
      background-color: #0a0a0a;
      box-shadow: 0 0 0 1px #0a0a0a;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .oc-leader-local {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .oc-link-down--from-shelf {
      height: 32px;
      min-height: 20px;
    }
    .oc-subtree > .oc-tree {
      margin-top: 0;
    }
    .oc-subtree > .oc-node + .oc-tree > .oc-multi-shelves > .oc-shelf > .oc-link-down:first-child,
    .oc-subtree > .oc-node + .oc-tree > .oc-shelf > .oc-link-down:first-child {
      margin-top: 0;
      min-height: 28px;
      height: 28px;
    }
    .oc-subtree > .oc-node:has(.oc-node-actions) + .oc-tree > .oc-multi-shelves > .oc-shelf > .oc-link-down:first-child,
    .oc-subtree > .oc-node:has(.oc-node-actions) + .oc-tree > .oc-shelf > .oc-link-down:first-child {
      min-height: 48px;
      height: 48px;
      margin-top: -0.15rem;
    }
    .oc-shelf--under-boss {
      align-items: center;
      width: max-content;
      max-width: none;
    }
    .oc-shelf--under-boss > .oc-leader-shelf {
      margin-top: -2px;
    }
    .oc-shelf--under-boss .oc-connector-band--from-boss > .oc-row {
      padding-top: 4px;
      padding-bottom: 0;
    }
    .oc-shelf--under-boss .oc-leader-shelf .oc-shelf--leaders {
      width: 100%;
      align-self: stretch;
    }
    .oc-col--has-shelf {
      align-items: center;
    }
    .oc-col--has-shelf > .oc-leader-shelf {
      width: 100%;
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
      flex-wrap: nowrap;
      justify-content: center;
      align-items: flex-start;
      gap: 2rem 2.5rem;
      width: max-content;
      max-width: none;
      margin: 0 auto;
    }
    .oc-spider-arm {
      flex: 0 0 auto;
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
      max-width: min(19rem, 90vw);
      min-width: 0;
      box-sizing: border-box;
      padding-inline: 0.35rem;
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
    .oc-multi-shelves {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .oc-link-down,
    .oc-link-join,
    .oc-drop,
    .oc-connector-band > .oc-hbar {
      background-color: #0a0a0a;
      box-shadow: 0 0 0 1px #0a0a0a;
    }
    .oc-link-down {
      width: 4px;
      min-width: 4px;
      height: 28px;
      min-height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .oc-link-down--root {
      height: 32px;
    }
    .oc-link-join {
      width: 4px;
      min-width: 4px;
      height: 22px;
      min-height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .oc-shelf {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      width: max-content;
      max-width: none;
      box-sizing: border-box;
    }
    .oc-connector-band {
      position: relative;
      width: max-content;
      max-width: none;
    }
    .oc-connector-band {
      --hbar-l: 0px;
      --hbar-w: 3px;
    }
    .oc-connector-band > .oc-hbar {
      position: absolute;
      top: var(--hbar-t, 0px);
      left: var(--hbar-l);
      width: var(--hbar-w);
      min-width: 4px;
      height: 4px;
      min-height: 4px;
      border-radius: 2px;
      pointer-events: none;
    }
    .oc-connector-band > .oc-row {
      padding-top: 4px;
    }
    .oc-row {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: flex-start;
      column-gap: clamp(0.85rem, 1.8vw, 2.25rem);
      row-gap: 1rem;
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
      min-width: 9.25rem;
      max-width: none;
      padding: 0 clamp(0.45rem, 1.2vw, 1rem);
      box-sizing: border-box;
    }
    .oc-drop {
      width: 4px;
      min-width: 4px;
      height: 22px;
      min-height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
      margin: 0 auto;
    }
    .oc-unassigned {
      margin-top: 1.75rem;
      padding: 1.5rem 0.75rem 0;
      border-top: 1px solid rgba(10, 10, 10, 0.12);
      max-width: 1100px;
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
      margin: 0 0 1rem;
      text-align: center;
      font-size: 0.76rem;
      color: rgba(10, 10, 10, 0.5);
      line-height: 1.45;
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;
    }
    .oc-unassigned-block {
      margin-bottom: 1.35rem;
    }
    .oc-unassigned-block-title {
      margin: 0 0 0.65rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #0066cc;
      text-align: center;
    }
    .oc-unassigned-row {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: flex-start;
      gap: clamp(0.75rem, 1.5vw, 1.75rem);
      margin-bottom: 0.65rem;
      width: 100%;
      max-width: 100%;
    }
    .oc-unassigned-row:last-child {
      margin-bottom: 0;
    }
    .oc-search-bar {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.65rem;
      margin-top: 1.25rem;
      max-width: 36rem;
    }
    .oc-search-field {
      width: 100%;
    }
    .oc-search-count,
    .oc-search-empty {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0066cc;
      margin: 0;
    }
    .oc-search-empty {
      color: rgba(10, 10, 10, 0.5);
    }
    .oc-search-picks {
      width: 100%;
    }
    .oc-search-picks-title {
      margin: 0 0 0.45rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #103847;
    }
    .oc-search-picks-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 11rem;
      overflow-y: auto;
      padding-right: 0.15rem;
    }
    .oc-search-pick {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
      width: 100%;
      padding: 0.5rem 0.65rem;
      border: 1px solid rgba(16, 56, 71, 0.14);
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
    }
    .oc-search-pick:hover {
      border-color: #0066cc;
      background: #f5faff;
    }
    .oc-search-pick--active {
      border-color: #0066cc;
      background: #e8f2ff;
      box-shadow: 0 0 0 1px #0066cc;
    }
    .oc-search-pick-name {
      font-size: 0.86rem;
      font-weight: 600;
      color: #0a0a0a;
    }
    .oc-search-pick-meta {
      font-size: 0.72rem;
      color: rgba(10, 10, 10, 0.55);
    }
    .oc-node--match {
      outline: 2px solid #0066cc;
      outline-offset: 4px;
      border-radius: 12px;
    }
    .oc-node--focused {
      outline: 3px solid #e9a319;
      outline-offset: 5px;
      border-radius: 12px;
      animation: oc-focus-pulse 1.2s ease-in-out 2;
    }
    @keyframes oc-focus-pulse {
      0%,
      100% {
        outline-color: #e9a319;
      }
      50% {
        outline-color: #0066cc;
      }
    }
    .oc-node--dim {
      opacity: 0.28;
      filter: grayscale(0.35);
    }
    .oc-node-action {
      margin-top: 0.35rem;
      color: #0066cc !important;
    }
    .oc-node-actions {
      display: flex;
      justify-content: center;
      gap: 0.1rem;
      margin-top: 0.2rem;
    }
    .oc-mode-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0 0.5rem;
    }
    .oc-mode-btn--active {
      border-color: #0066cc !important;
      color: #0066cc;
      font-weight: 600;
    }
    .oc-toolbar-manual {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .oc-toolbar-manual button mat-icon {
      margin-right: 0.25rem;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .oc-empty-block {
      text-align: center;
      padding: 2rem 1rem;
    }
    .oc-empty-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 1rem;
    }
    .oc-body {
      display: block;
    }
    .oc-body--manual {
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
      overflow: visible;
    }
    .oc-pool {
      flex: 0 0 min(280px, 32vw);
      overflow: visible;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 1rem;
      position: sticky;
      top: 1rem;
      z-index: 2;
    }
    .oc-pool-scroll {
      max-height: calc(100vh - 240px);
      overflow-x: visible;
      overflow-y: auto;
      margin: 0 -0.25rem;
      padding: 0 0.25rem;
    }
    .oc-pool-title {
      margin: 0 0 0.35rem;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .oc-pool-hint {
      margin: 0 0 0.75rem;
      font-size: 0.78rem;
      line-height: 1.4;
      color: #555;
    }
    .oc-pool-icon-inline {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      vertical-align: middle;
    }
    .oc-pool-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .oc-pool-chip {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.15rem 0.5rem;
      width: 100%;
      padding: 0.45rem 0.55rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fafafa;
      cursor: pointer;
      font-size: 0.8rem;
      text-align: left;
      font-family: inherit;
    }
    .oc-pool-chip:disabled {
      cursor: default;
      opacity: 0.65;
    }
    .oc-pool-chip--selected {
      border-color: #0066cc;
      background: #e8f2fc;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    }
    .oc-pool-total {
      font-weight: 500;
      color: #888;
      font-size: 0.85em;
    }
    .oc-pool-empty {
      margin: 0.5rem 0;
      font-size: 0.82rem;
      color: #555;
      line-height: 1.4;
    }
    .oc-pool-chip--match {
      outline: 2px solid #e9a319;
    }
    .oc-pool-pick {
      grid-row: span 2;
      color: #0066cc;
      font-size: 1.2rem;
    }
    .oc-link-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      margin: 0 0 1rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: #fff8e6;
      border: 1px solid #e9c46a;
      font-size: 0.88rem;
    }
    .oc-link-banner mat-icon {
      color: #a37f3e;
    }
    .oc-node--link-target {
      cursor: pointer;
      outline: 2px solid transparent;
      outline-offset: 4px;
      transition: outline-color 0.15s ease;
    }
    .oc-node--link-target:hover {
      outline-color: #0066cc;
    }
    .oc-root-actions {
      text-align: center;
      margin: 0 auto 1.25rem;
    }
    .oc-pool-name {
      font-weight: 700;
      line-height: 1.2;
    }
    .oc-pool-meta {
      grid-column: 2;
      color: #666;
      font-size: 0.72rem;
    }
    .oc-main {
      flex: 1;
      min-width: 0;
      overflow: visible;
    }
    .oc-viewport.oc-viewport--employee-drag {
      cursor: default;
    }
    .oc-pool-chip.cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0.2, 0, 0.2, 1);
    }
    .oc-pool-chip.cdk-drag-placeholder {
      opacity: 0.35;
      border-style: dashed;
    }
    .oc-empty--inline {
      margin: 0 0 1rem;
      text-align: center;
      color: #444;
    }
    .oc-node-drag {
      margin-top: 0.25rem;
      color: #888;
      cursor: grab;
    }
    .oc-reports {
      margin: 0.25rem 0 0;
      font-size: 0.65rem;
      color: #555;
      line-height: 1.35;
      max-width: 11rem;
    }
    .oc-report-chip {
      display: inline-block;
      margin: 0.1rem 0.15rem 0 0;
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
      background: #eef4fa;
    }
  `,
})
export class OrgChartComponent implements OnInit {
  @ViewChild('chartViewport') private chartViewport?: ElementRef<HTMLElement>;

  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  /** Expuesto al template para data-oc-key en nodos. */
  readonly trackKeyForNode = trackKeyForNode;
  readonly trackKeyForMember = trackKeyForMember;
  readonly manualDragPayload = manualDragPayload;

  private lastPtrX = 0;
  private lastPtrY = 0;
  private activePointerId: number | null = null;

  readonly viewMode = signal<OrgChartViewMode>('manual');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<OrgChartPayload | null>(null);
  readonly manualGraph = signal<ManualGraphState | null>(null);

  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly viewportDragging = signal(false);
  readonly employeeDragging = signal(false);
  readonly selectedPoolNode = signal<OrgChartLayoutNodeRead | null>(null);
  readonly linkMode = signal(false);

  readonly canvasTransform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`,
  );
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  searchText = '';
  private readonly searchQuery = signal('');

  readonly canEditManual = () => this.auth.hasAnyPermission(['org_chart.edit']);
  readonly canReassignEmployees = this.auth.hasPermissionInNamespace('employees');
  readonly canReassignUsers = this.auth.hasPermissionInNamespace('users');

  readonly searchActive = computed(() => this.searchQuery().trim().length > 0);

  readonly manualPoolTotal = computed((): number => this.manualGraph()?.nodes.length ?? 0);

  readonly manualPoolPending = computed((): OrgChartLayoutNodeRead[] =>
    pendingPoolNodes(this.manualGraph()),
  );

  readonly manualPoolFiltered = computed((): OrgChartLayoutNodeRead[] => {
    const q = this.searchQuery().trim().toLowerCase();
    const pool = this.manualPoolPending();
    if (!q) {
      return pool;
    }
    return pool.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.position_label.toLowerCase().includes(q) ||
        n.area_name.toLowerCase().includes(q),
    );
  });

  readonly searchMatchKeys = computed(() => {
    const q = this.searchQuery().trim();
    const payload = this.data();
    if (!q || !payload) {
      return null;
    }
    const keys = new Set<string>();
    for (const p of collectOrgChartPeople(payload)) {
      if (personMatchesQuery(p, q)) {
        keys.add(p.key);
      }
    }
    if (this.viewMode() === 'manual') {
      const g = this.manualGraph();
      if (g) {
        for (const n of g.nodes) {
          const key = `manual-${n.id}`;
          if (
            n.name.toLowerCase().includes(q.toLowerCase()) ||
            n.position_label.toLowerCase().includes(q.toLowerCase()) ||
            n.area_name.toLowerCase().includes(q.toLowerCase())
          ) {
            keys.add(key);
          }
        }
      }
    }
    return keys;
  });

  readonly searchMatchCount = computed(() => this.searchMatchKeys()?.size ?? 0);

  readonly searchResults = computed((): OrgChartPersonRef[] => {
    const q = this.searchQuery().trim();
    const payload = this.data();
    if (!q || !payload) {
      return [];
    }
    const seen = new Set<string>();
    const out: OrgChartPersonRef[] = [];
    for (const p of collectOrgChartPeople(payload)) {
      if (!personMatchesQuery(p, q) || seen.has(p.key)) {
        continue;
      }
      seen.add(p.key);
      out.push(p);
    }
    if (this.viewMode() === 'manual') {
      const g = this.manualGraph();
      if (g) {
        for (const n of pendingPoolNodes(g)) {
          const key = `manual-${n.id}`;
          if (seen.has(key)) {
            continue;
          }
          const ref: OrgChartPersonRef = {
            key,
            name: n.name,
            position: n.position_label,
            areaName: n.area_name,
            kind: 'manual',
            userId: n.user_id,
            employeeId: n.employee_id,
          };
          if (personMatchesQuery(ref, q)) {
            seen.add(key);
            out.push(ref);
          }
        }
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  });

  readonly focusedKey = signal<string | null>(null);

  /** Máximo de colaboradores por fila (empleados bajo un líder y bloque “sin líder”). */
  readonly maxPeersPerRow = 5;

  /** Sin líder: Socios → Gerencia → resto (según texto del cargo). */
  readonly unassignedSections = computed(() => {
    const raw = this.data()?.unassigned ?? [];
    const byName = (a: OrgChartMember, b: OrgChartMember) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    const socios = raw.filter((m) => /\bsocios?\b/i.test(m.position)).sort(byName);
    const ger = raw
      .filter((m) => /\bgerencia\b/i.test(m.position) && !/\bsocios?\b/i.test(m.position))
      .sort(byName);
    const used = new Set<number>([...socios, ...ger].map((x) => x.id));
    const otros = raw.filter((m) => !used.has(m.id)).sort(byName);
    const out: { key: string; title: string; items: OrgChartMember[] }[] = [];
    if (socios.length) {
      out.push({ key: 'socios', title: 'Socios', items: socios });
    }
    if (ger.length) {
      out.push({ key: 'gerencia', title: 'Gerencia', items: ger });
    }
    if (otros.length) {
      out.push({ key: 'otros', title: 'Colaboradores', items: otros });
    }
    return out;
  });

  private readonly connectorRefresh = effect(() => {
    this.zoom();
    this.panX();
    this.panY();
    this.data();
    queueMicrotask(() => window.dispatchEvent(new Event('resize')));
  });

  ngOnInit(): void {
    this.loadChart();
  }

  setViewMode(mode: OrgChartViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
    this.clearSearch();
    this.loadChart();
  }

  onSearchChange(): void {
    this.searchQuery.set(this.searchText);
    queueMicrotask(() => this.applySearchNavigation());
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchQuery.set('');
    this.focusedKey.set(null);
  }

  focusPerson(key: string): void {
    this.focusedKey.set(key);
    queueMicrotask(() => requestAnimationFrame(() => this.navigateToPerson(key)));
  }

  private applySearchNavigation(): void {
    const results = this.searchResults();
    if (results.length === 1) {
      this.focusPerson(results[0].key);
    } else if (results.length > 1) {
      this.focusedKey.set(null);
    } else {
      this.focusedKey.set(null);
    }
  }

  private navigateToPerson(key: string): void {
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    const el = document.querySelector(`[data-oc-key="${escaped}"]`) as HTMLElement | null;
    if (!el) {
      return;
    }

    const inChart = el.closest('.oc-viewport');
    if (inChart && this.chartViewport?.nativeElement) {
      if (this.zoom() < 0.9) {
        this.zoom.set(1);
      }
      requestAnimationFrame(() => this.centerInChartViewport(el));
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }

  private centerInChartViewport(el: HTMLElement): void {
    const viewport = this.chartViewport?.nativeElement;
    if (!viewport) {
      return;
    }
    const vpRect = viewport.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elCenterX = elRect.left + elRect.width / 2 - vpRect.left;
    const elCenterY = elRect.top + elRect.height / 2 - vpRect.top;
    const vpCenterX = vpRect.width / 2;
    const vpCenterY = vpRect.height / 2;
    this.panX.update((x) => x + (vpCenterX - elCenterX));
    this.panY.update((y) => y + (vpCenterY - elCenterY));
  }

  nodeMatchesSearch(node: OrgChartNode): boolean {
    const keys = this.searchMatchKeys();
    if (keys === null || node.kind === 'group') {
      return false;
    }
    return keys.has(trackKeyForNode(node));
  }

  nodeDimmed(node: OrgChartNode): boolean {
    if (this.viewMode() === 'manual') {
      return false;
    }
    const keys = this.searchMatchKeys();
    if (keys === null || node.kind === 'group') {
      return false;
    }
    return !keys.has(trackKeyForNode(node));
  }

  memberMatchesSearch(m: OrgChartMember): boolean {
    const keys = this.searchMatchKeys();
    if (keys === null) {
      return false;
    }
    return keys.has(trackKeyForMember(m));
  }

  memberDimmed(m: OrgChartMember): boolean {
    const keys = this.searchMatchKeys();
    if (keys === null) {
      return false;
    }
    return !keys.has(trackKeyForMember(m));
  }

  canEditManualNode(node: OrgChartNode): boolean {
    return this.viewMode() === 'manual' && this.canEditManual() && node.kind === 'manual' && node.layout_node_id != null;
  }

  canReassignNode(node: OrgChartNode): boolean {
    if (this.viewMode() !== 'employees') {
      return false;
    }
    if (node.kind === 'employee') {
      return this.canReassignEmployees && node.employee_id != null;
    }
    if (node.kind === 'user') {
      return this.canReassignUsers && node.user_id != null;
    }
    return false;
  }

  manualParentIds(layoutNodeId: number): number[] {
    return parentIdsFor(this.manualGraph(), layoutNodeId);
  }

  manualNodeLabel(nodeId: number): string {
    return nodeLabelById(this.manualGraph(), nodeId);
  }

  poolChipMatchesSearch(n: OrgChartLayoutNodeRead): boolean {
    const keys = this.searchMatchKeys();
    if (keys === null) {
      return false;
    }
    return keys.has(`manual-${n.id}`);
  }

  onPoolChipClick(n: OrgChartLayoutNodeRead): void {
    if (!this.canEditManual()) {
      return;
    }
    if (isNodeOnChart(this.manualGraph(), n.id)) {
      this.snack.open('Esta persona ya está en el organigrama', 'Cerrar', { duration: 4000 });
      return;
    }
    this.selectedPoolNode.set(n);
    this.linkMode.set(false);
    this.dialog
      .open(OrgChartPlaceDialogComponent, {
        width: 'min(96vw, 420px)',
        data: { node: n, parentCount: this.manualParentIds(n.id).length },
      })
      .afterClosed()
      .subscribe((action: OrgChartPlaceDialogResult) => this.handlePlaceAction(n, action));
  }

  private handlePlaceAction(n: OrgChartLayoutNodeRead, action: OrgChartPlaceDialogResult): void {
    if (!action) {
      return;
    }
    if (action === 'top') {
      this.pinNodeAtTop(n);
      return;
    }
    if (action === 'link') {
      this.selectedPoolNode.set(n);
      this.linkMode.set(true);
      this.snack.open('Seleccione al líder en el diagrama (clic en su tarjeta)', 'Cerrar', { duration: 5000 });
      return;
    }
    if (action === 'leaders') {
      this.openLeadersForPoolNode(n);
    }
  }

  cancelLinkMode(): void {
    this.linkMode.set(false);
    this.selectedPoolNode.set(null);
  }

  canPickAsLeader(node: OrgChartNode): boolean {
    const child = this.selectedPoolNode();
    return (
      this.linkMode() &&
      !!child &&
      node.kind === 'manual' &&
      node.layout_node_id != null &&
      node.layout_node_id !== child.id
    );
  }

  onChartNodeClick(node: OrgChartNode, event: Event): void {
    if (!this.canPickAsLeader(node) || node.layout_node_id == null) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('button, .oc-node-drag, .oc-node-actions')) {
      return;
    }
    event.stopPropagation();
    const child = this.selectedPoolNode()!;
    this.dialog
      .open(OrgChartLinkConfirmDialogComponent, {
        width: 'min(96vw, 400px)',
        data: {
          childName: child.name,
          childRole: child.position_label || 'Sin cargo',
          leaderName: node.name,
          leaderRole: node.position_label || 'Sin cargo',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.addManualEdge(child.id, node.layout_node_id!);
        this.linkMode.set(false);
        this.selectedPoolNode.set(null);
      });
  }

  placeSelectedAtTop(): void {
    const n = this.selectedPoolNode();
    if (!n) {
      return;
    }
    this.pinNodeAtTop(n);
  }

  private pinNodeAtTop(n: OrgChartLayoutNodeRead): void {
    if (
      !confirm(
        `¿Colocar a «${n.name}» en el nivel superior del organigrama (sin líder asignado)?`,
      )
    ) {
      return;
    }
    this.api.post(`/org-chart/manual/nodes/${n.id}/pin-root`, {}).subscribe({
      next: () => {
        this.linkMode.set(false);
        this.reloadAfterManualEdit('Colaborador en nivel superior');
      },
      error: () => this.snack.open('No se pudo colocar en la cima', 'Cerrar', { duration: 4000 }),
    });
  }

  private openLeadersForPoolNode(n: OrgChartLayoutNodeRead): void {
    const g = this.manualGraph();
    if (!g) {
      return;
    }
    const allNodes = g.nodes
      .filter((x) => x.id !== n.id)
      .map((x) => ({
        id: x.id,
        label: `${x.name} — ${x.position_label || 'Sin cargo'}`,
      }));
    this.dialog
      .open(OrgChartManualLeadersDialogComponent, {
        width: 'min(96vw, 460px)',
        data: {
          layoutNodeId: n.id,
          name: n.name,
          parentIds: parentIdsFor(g, n.id),
          allNodes,
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.reloadAfterManualEdit();
        }
      });
  }

  private addManualEdge(childNodeId: number, parentNodeId: number): void {
    this.api
      .post('/org-chart/manual/edges', { child_node_id: childNodeId, parent_node_id: parentNodeId })
      .subscribe({
        next: () => this.reloadAfterManualEdit('Relación agregada'),
        error: () => this.snack.open('No se pudo crear la relación', 'Cerrar', { duration: 4000 }),
      });
  }

  resetManualLayout(): void {
    if (!this.canEditManual() || !confirm('¿Quitar todas las relaciones del organigrama manual? Los empleados se mantienen en la lista.')) {
      return;
    }
    this.loading.set(true);
    this.api.post<ManualOrgChartPayload>('/org-chart/manual/reset-layout', {}).subscribe({
      next: (payload) => {
        this.applyManualPayload(payload);
        this.loading.set(false);
        this.snack.open('Relaciones eliminadas', 'Cerrar', { duration: 3500 });
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al limpiar', 'Cerrar', { duration: 4000 });
      },
    });
  }

  openEditManualNode(node: OrgChartNode, event: Event): void {
    event.stopPropagation();
    if (node.layout_node_id == null) {
      return;
    }
    this.openManualNodeDialog({
      mode: 'edit',
      layoutNodeId: node.layout_node_id,
      initial: {
        name: node.name,
        position_label: node.position_label,
        area_name: node.area_name,
      },
    });
  }

  openManualLeadersForNode(node: OrgChartNode, event: Event): void {
    event.stopPropagation();
    if (node.layout_node_id == null) {
      return;
    }
    const g = this.manualGraph();
    if (!g) {
      return;
    }
    const allNodes = g.nodes
      .filter((n) => n.id !== node.layout_node_id)
      .map((n) => ({
        id: n.id,
        label: `${n.name} — ${n.position_label || 'Sin cargo'}`,
      }));
    this.dialog
      .open(OrgChartManualLeadersDialogComponent, {
        width: 'min(96vw, 460px)',
        data: {
          layoutNodeId: node.layout_node_id,
          name: node.name,
          parentIds: parentIdsFor(g, node.layout_node_id),
          allNodes,
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.reloadAfterManualEdit();
        }
      });
  }

  private openManualNodeDialog(data: OrgChartManualNodeDialogData): void {
    this.dialog
      .open(OrgChartManualNodeDialogComponent, {
        width: 'min(96vw, 440px)',
        data,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.reloadAfterManualEdit();
        }
      });
  }

  private applyManualPayload(payload: ManualOrgChartPayload): void {
    this.manualGraph.set({ nodes: payload.nodes, edges: payload.edges });
    this.data.set({ roots: payload.roots, unassigned: payload.unassigned });
  }

  private reloadAfterManualEdit(message = 'Organigrama actualizado'): void {
    this.loadChart({ silent: true, fitCenter: true });
    this.snack.open(message, 'Cerrar', { duration: 3500 });
  }

  private static readonly CHART_FIT_PADDING = 56;
  private static readonly CHART_FIT_MAX_ZOOM = 1.12;

  /** Ajusta zoom y pan para que el organigrama quede centrado y visible en el lienzo. */
  fitChartToViewport(): void {
    const viewport = this.chartViewport?.nativeElement;
    if (!viewport) {
      return;
    }
    const canvas = viewport.querySelector('.oc-canvas') as HTMLElement | null;
    if (!canvas || !(this.data()?.roots.length ?? 0)) {
      this.resetView();
      return;
    }

    const pad = OrgChartComponent.CHART_FIT_PADDING;
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    const contentW = canvas.offsetWidth;
    const contentH = canvas.offsetHeight;
    if (contentW < 8 || contentH < 8) {
      this.resetView();
      return;
    }

    const availW = Math.max(120, vpW - pad * 2);
    const availH = Math.max(120, vpH - pad * 2);
    let z = Math.min(availW / contentW, availH / contentH);
    z = Math.min(z, OrgChartComponent.CHART_FIT_MAX_ZOOM);
    z = Math.max(0.28, Math.min(2.85, +z.toFixed(3)));

    const panX = Math.round(vpW / 2 - (contentW * z) / 2);
    const panY = Math.round(vpH / 2 - (contentH * z) / 2);

    this.zoom.set(z);
    this.panX.set(panX);
    this.panY.set(panY);
    this.scheduleConnectorRefresh();
  }

  private scheduleFitChartToViewport(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('oc-chart-reflow'));
        requestAnimationFrame(() => this.fitChartToViewport());
      });
    });
  }

  private scheduleConnectorRefresh(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('oc-chart-reflow'));
      });
    });
  }

  openReassignForNode(node: OrgChartNode, event: Event): void {
    event.stopPropagation();
    const target = this.reassignTargetFromNode(node);
    if (!target) {
      return;
    }
    this.openReassignDialog(target);
  }

  openReassignForMember(m: OrgChartMember, event: Event): void {
    event.stopPropagation();
    this.openReassignDialog({
      name: m.name,
      kind: 'employee',
      userId: null,
      employeeId: m.id,
    });
  }

  private reassignTargetFromNode(node: OrgChartNode): OrgChartReassignTarget | null {
    if (node.kind === 'employee' && node.employee_id != null) {
      return {
        name: node.name,
        kind: 'employee',
        userId: null,
        employeeId: node.employee_id,
      };
    }
    if (node.kind === 'user' && node.user_id != null) {
      return {
        name: node.name,
        kind: 'user',
        userId: node.user_id,
        employeeId: null,
      };
    }
    return null;
  }

  private openReassignDialog(target: OrgChartReassignTarget): void {
    this.dialog
      .open(OrgChartReassignDialogComponent, {
        width: 'min(96vw, 440px)',
        data: target,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.loadChart({ preserveView: true, silent: true });
          this.snack.open('Líder actualizado', 'Cerrar', { duration: 4000 });
        }
      });
  }

  private loadChart(opts?: { preserveView?: boolean; silent?: boolean; fitCenter?: boolean }): void {
    if (!opts?.silent) {
      this.loading.set(true);
    }
    this.error.set(null);
    const url = this.viewMode() === 'manual' ? '/org-chart/manual' : '/employees/org-chart';
    this.api.get<OrgChartPayload | ManualOrgChartPayload>(url).subscribe({
      next: (payload) => {
        if (this.viewMode() === 'manual') {
          this.applyManualPayload(payload as ManualOrgChartPayload);
        } else {
          this.manualGraph.set(null);
          this.data.set(payload);
        }
        this.loading.set(false);
        if (opts?.fitCenter) {
          this.scheduleFitChartToViewport();
        } else if (opts?.preserveView) {
          this.scheduleConnectorRefresh();
        } else if (this.viewMode() === 'manual' && (this.data()?.roots.length ?? 0) > 0) {
          this.scheduleFitChartToViewport();
        } else {
          this.resetView();
        }
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
    this.scheduleConnectorRefresh();
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(0.28, +((z / 1.14) as number).toFixed(3)));
    this.scheduleConnectorRefresh();
  }

  resetView(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
    this.scheduleConnectorRefresh();
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
    this.scheduleConnectorRefresh();
  }

  onCdkDragStarted(): void {
    this.employeeDragging.set(true);
  }

  onCdkDragEnded(): void {
    this.employeeDragging.set(false);
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || this.employeeDragging()) {
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, a, input, textarea, select, mat-form-field, .cdk-drag, .oc-pool-chip, .oc-node-drag',
      )
    ) {
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
    return trackKeyForNode(n);
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

  /**
   * Bajo un nodo con varios hijos: si todos son empleados, filas de hasta 5; si hay usuarios
   * (p. ej. varios líderes bajo un superior), una sola fila horizontal.
   */
  peerShelves(nodes: OrgChartNode[] | null | undefined): OrgChartNode[][] {
    const list = nodes ?? [];
    if (!list.length) {
      return [];
    }
    if (list.every((c) => c.kind === 'employee' || c.kind === 'manual')) {
      return this.chunkList(list, this.maxPeersPerRow);
    }
    return [list];
  }

  chunkMembers(items: OrgChartMember[]): OrgChartMember[][] {
    return this.chunkList(items, this.maxPeersPerRow);
  }

  peerRowTrack(row: OrgChartNode[], idx: number): string {
    return `p-${idx}-${row.map((x) => this.trackNode(x)).join('|')}`;
  }

  rowIsLeaderShelf(row: OrgChartNode[]): boolean {
    return row.length === 1 && row[0].kind === 'leader_shelf';
  }

  rowTrack(row: OrgChartMember[], idx: number): string {
    return `m-${idx}-${row.map((x) => x.id).join('-')}`;
  }

  private chunkList<T>(arr: T[], size: number): T[][] {
    if (!arr.length) {
      return [];
    }
    const n = Math.max(1, size);
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) {
      out.push(arr.slice(i, i + n));
    }
    return out;
  }
}
