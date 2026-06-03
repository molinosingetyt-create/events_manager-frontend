import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
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
import { OrgChartReassignDialogComponent } from './org-chart-reassign-dialog.component';
import { OrgChartShelfHbarDirective } from './org-chart-shelf-hbar.directive';
import type { OrgChartMember, OrgChartNode, OrgChartPayload, OrgChartReassignTarget } from './org-chart.types';
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
    OrgChartShelfHbarDirective,
  ],
  template: `
    <div class="oc-board">
      <header class="oc-hero">
        <p class="oc-hero-kicker">Organigrama</p>
        <h1 class="oc-hero-brand">Molinos del Atlántico</h1>
        <p class="oc-hero-sub">
          Los <strong>líderes</strong> del mismo nivel se muestran en una sola fila horizontal. Los
          <strong>colaboradores</strong> bajo un mismo líder se reparten en <strong>filas de hasta 5</strong>. Zoom:
          <strong>Ctrl + rueda</strong>; arrastre para mover el lienzo.
        </p>
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
              <span class="oc-search-count">1 coincidencia — ubicando en el organigrama…</span>
            } @else {
              <div class="oc-search-picks">
                <p class="oc-search-picks-title">
                  {{ searchResults().length }} coincidencias — elija para ubicar en el organigrama:
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
              [attr.data-oc-key]="node.kind === 'group' ? null : trackKeyForNode(node)"
              [class.oc-node--root]="depth === 0"
              [class.oc-node--mid]="depth === 1"
              [class.oc-node--leaf]="depth >= 2"
              [class.oc-node--match]="nodeMatchesSearch(node)"
              [class.oc-node--dim]="nodeDimmed(node)"
              [class.oc-node--focused]="focusedKey() === trackKeyForNode(node)"
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
              @if (canReassignNode(node)) {
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

            @if (node.children?.length === 1) {
              <div class="oc-tree oc-tree--single">
                <div class="oc-trunk" [class.oc-trunk--long]="depth === 0"></div>
                <ng-container *ngTemplateOutlet="branch; context: { node: node.children[0], depth: depth + 1 }" />
              </div>
            } @else if (node.children && node.children.length > 1) {
              <div class="oc-tree oc-tree--multi">
                <div class="oc-trunk"></div>
                <div class="oc-multi-shelves">
                  @for (peerRow of peerShelves(node.children); track peerRowTrack(peerRow, $index)) {
                    @if ($index > 0) {
                      <div class="oc-trunk oc-trunk--chunk-join" aria-hidden="true"></div>
                    }
                    <div class="oc-shelf">
                      <div class="oc-hbar" aria-hidden="true"></div>
                      <div class="oc-row">
                        @for (c of peerRow; track trackNode(c)) {
                          <div class="oc-col">
                            <div class="oc-drop" aria-hidden="true"></div>
                            <ng-container *ngTemplateOutlet="branch; context: { node: c, depth: depth + 1 }" />
                          </div>
                        }
                      </div>
                    </div>
                  }
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
              #chartViewport
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
      display: inline-block;
      transform-origin: 0 0;
      will-change: transform;
      padding: 1.75rem 2rem 2.25rem;
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
    .oc-trunk--chunk-join {
      height: 14px;
      margin: 0;
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
      width: 3px;
      height: 20px;
      background: #0a0a0a;
      border-radius: 3px;
      flex-shrink: 0;
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

  searchText = '';
  private readonly searchQuery = signal('');

  readonly canReassignEmployees = this.auth.hasPermissionInNamespace('employees');
  readonly canReassignUsers = this.auth.hasPermissionInNamespace('users');

  readonly searchActive = computed(() => this.searchQuery().trim().length > 0);

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
    return keys;
  });

  readonly searchMatchCount = computed(() => this.searchMatchKeys()?.size ?? 0);

  readonly searchResults = computed((): OrgChartPersonRef[] => {
    const q = this.searchQuery().trim();
    const payload = this.data();
    if (!q || !payload) {
      return [];
    }
    return collectOrgChartPeople(payload)
      .filter((p) => personMatchesQuery(p, q))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
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

  ngOnInit(): void {
    this.loadOrgChart();
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

  canReassignNode(node: OrgChartNode): boolean {
    if (node.kind === 'employee') {
      return this.canReassignEmployees && node.employee_id != null;
    }
    if (node.kind === 'user') {
      return this.canReassignUsers && node.user_id != null;
    }
    return false;
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
          this.loadOrgChart({ preserveView: true, silent: true });
          this.snack.open('Líder actualizado', 'Cerrar', { duration: 4000 });
        }
      });
  }

  private loadOrgChart(opts?: { preserveView?: boolean; silent?: boolean }): void {
    if (!opts?.silent) {
      this.loading.set(true);
    }
    this.error.set(null);
    this.api.get<OrgChartPayload>('/employees/org-chart').subscribe({
      next: (payload) => {
        this.data.set(payload);
        this.loading.set(false);
        if (!opts?.preserveView) {
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
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, mat-form-field')) {
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
    if (list.every((c) => c.kind === 'employee')) {
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
