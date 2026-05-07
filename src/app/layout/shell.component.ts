import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { NotificationsService } from '../core/services/notifications.service';
import { RealtimeService } from '../core/services/realtime.service';
import { realtimeAffectsTable } from '../core/utils/realtime-tables';
import { TranslateLabelPipe } from '../core/pipes/translate-label.pipe';

@Component({
  selector: 'em-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    TranslateLabelPipe,
  ],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <button mat-icon-button (click)="sidenav.toggle()" class="menu-btn" aria-label="Abrir o cerrar menú">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="title">Gestión de eventos</span>
      </span>
      <span class="spacer"></span>
      @if (auth.user(); as u) {
        <button
          mat-icon-button
          type="button"
          class="notif-trigger"
          [matMenuTriggerFor]="notifMenu"
          (click)="notifications.loadUnreadList()"
          aria-label="Notificaciones"
        >
          <mat-icon
            [matBadge]="notifications.unreadCount()"
            [matBadgeHidden]="notifications.unreadCount() === 0"
            matBadgeSize="small"
            matBadgeColor="warn"
            >notifications</mat-icon
          >
        </button>
        <mat-menu #notifMenu="matMenu" class="notif-menu-panel" (closed)="notifications.onMenuClosed()">
          <div class="notif-menu-head" (click)="$event.stopPropagation()">
            <span>Notificaciones</span>
            @if (notifications.unreadCount() > 0) {
              <button mat-button type="button" (click)="notifications.markAllRead($event)">Marcar todas</button>
            }
          </div>
          <div class="notif-menu-body">
            @if (notifications.loading()) {
              <div class="notif-empty">Cargando…</div>
            } @else if (!notifications.items().length) {
              <div class="notif-empty">No hay notificaciones sin leer</div>
            } @else {
              @for (n of notifications.items(); track n.id) {
                <button
                  mat-menu-item
                  type="button"
                  class="notif-row"
                  (click)="notifications.openNotification(n, $event)"
                >
                  <span class="notif-msg">{{ n.message }}</span>
                  <span class="notif-time">{{ n.created_at | date: 'short' }}</span>
                </button>
              }
            }
          </div>
        </mat-menu>
        <span class="user-chip" [attr.title]="u.email">{{ u.name }} · {{ u.role | translateLabel: 'role' }}</span>
        <button mat-flat-button class="logout-btn" type="button" (click)="auth.logout()">Cerrar sesión</button>
      }
    </mat-toolbar>
    <mat-sidenav-container class="shell">
      <mat-sidenav
        #sidenav
        class="sidenav-panel"
        [mode]="(isHandset$ | async) ? 'over' : 'side'"
        [opened]="(isHandset$ | async) === false"
      >
        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/app/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Panel</span>
          </a>
          @if (auth.hasPermissionInNamespace('users')) {
            <a mat-list-item routerLink="/app/users" routerLinkActive="active">
              <mat-icon matListItemIcon>group</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
          }
          @if (auth.hasPermissionInNamespace('employees')) {
            <a mat-list-item routerLink="/app/employees" routerLinkActive="active">
              <mat-icon matListItemIcon>badge</mat-icon>
              <span matListItemTitle>Empleados</span>
            </a>
          }
          @if (auth.hasPermissionInNamespace('overtime')) {
            <a mat-list-item routerLink="/app/overtime" routerLinkActive="active">
              <mat-icon matListItemIcon>schedule</mat-icon>
              <span matListItemTitle>Horas extra</span>
            </a>
          }
          @if (auth.hasPermissionInNamespace('incapacity')) {
            <a mat-list-item routerLink="/app/incapacity" routerLinkActive="active">
              <mat-icon matListItemIcon>healing</mat-icon>
              <span matListItemTitle>Incapacidad</span>
            </a>
          }
          <div class="nav-group">
            <div class="nav-group-title">Configuraciones</div>
            <a
              mat-list-item
              routerLink="/app/configuracion/perfil"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-sub-item"
            >
              <mat-icon matListItemIcon>person</mat-icon>
              <span matListItemTitle>Perfil</span>
            </a>
            @if (auth.hasPermissionInNamespace('security')) {
              <a
                mat-list-item
                routerLink="/app/configuracion/seguridad"
                routerLinkActive="active"
                class="nav-sub-item"
              >
                <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
                <span matListItemTitle>Perfiles y permisos</span>
              </a>
            }
            @if (auth.hasPermissionInNamespace('areas')) {
              <a
                mat-list-item
                routerLink="/app/configuracion/areas"
                routerLinkActive="active"
                class="nav-sub-item"
              >
                <mat-icon matListItemIcon>domain</mat-icon>
                <span matListItemTitle>Áreas</span>
              </a>
            }
            @if (auth.hasPermissionInNamespace('catalog')) {
              <a
                mat-list-item
                routerLink="/app/configuracion/temporal"
                routerLinkActive="active"
                class="nav-sub-item"
              >
                <mat-icon matListItemIcon>more_time</mat-icon>
                <span matListItemTitle>Temporal</span>
              </a>
              <a
                mat-list-item
                routerLink="/app/configuracion/eps-arl"
                routerLinkActive="active"
                class="nav-sub-item"
              >
                <mat-icon matListItemIcon>local_hospital</mat-icon>
                <span matListItemTitle>EPS / ARL</span>
              </a>
              <a
                mat-list-item
                routerLink="/app/configuracion/diagnosticos"
                routerLinkActive="active"
                class="nav-sub-item"
              >
                <mat-icon matListItemIcon>assignment</mat-icon>
                <span matListItemTitle>Diagnósticos</span>
              </a>
            }
          </div>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="shell-content">
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #ffffff;
    }
    .toolbar {
      position: fixed;
      top: 0;
      right: 0;
      left: 220px;
      width: auto !important;
      z-index: 20;
      min-height: 64px;
      height: 64px;
      padding: 0.5rem 1.25rem;
      background: linear-gradient(180deg, #103847 0%, #0066CC 100%) !important;
      color: #FCEDD9;
      border: 0;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: none;
      gap: 0.5rem;
      overflow: visible;
    }
    .brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.2rem;
      min-width: 0;
    }
    .brand-mark {
      display: none;
    }
    .title {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -0.02em;
      color: #FCEDD9;
      line-height: 1.15;
    }
    .title::after {
      content: 'Administración de eventos corporativos';
      display: block;
      margin-top: 0.3rem;
      font-size: 0.74rem;
      font-weight: 400;
      letter-spacing: 0;
      color: rgba(252, 237, 217, 0.78);
    }
    .spacer {
      flex: 1;
      min-width: 1rem;
    }
    .notif-trigger {
      margin-right: 0.15rem;
      color: #FCEDD9;
    }
    .user-chip {
      margin-right: 0.35rem;
      font-size: 0.72rem;
      line-height: 1.2;
      max-width: none;
      white-space: nowrap;
      overflow: visible;
      text-overflow: unset;
      color: rgba(252, 237, 217, 0.82);
      text-align: right;
      padding: 0;
      border-radius: 0;
      background: transparent;
      flex: 0 0 auto;
    }
    .logout-btn {
      --mdc-filled-button-container-color: #FCEDD9;
      --mdc-filled-button-label-text-color: #103847;
      background-color: #FCEDD9 !important;
      color: #103847 !important;
      font-weight: 600;
      border-radius: 999px;
      padding: 0 0.8rem;
      min-height: 32px;
      box-shadow: none;
      flex: 0 0 auto;
      display: inline-flex !important;
    }
    .logout-btn .mdc-button__label,
    .logout-btn .mat-mdc-button-touch-target {
      color: inherit;
    }
    .logout-btn:hover {
      --mdc-filled-button-hover-state-layer-color: rgba(0, 102, 204, 0.1);
      background-color: #ffffff !important;
      color: #0066CC !important;
    }
    .shell {
      min-height: 100vh;
      background: linear-gradient(180deg, #103847 0%, #0066CC 100%);
    }
    .sidenav-panel {
      width: 220px;
      border-right: 0;
      border-radius: 0 !important;
      background: linear-gradient(180deg, #103847 0%, #0066CC 100%);
      color: #FCEDD9;
      box-shadow: none;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      height: 100vh;
      overflow: hidden;
    }
    .sidenav-panel::before {
      content: '';
      display: block;
      height: 64px;
      background:
        url('/assets/logo-la-nieve.svg') 0.78rem 0.55rem / 40px 50px no-repeat,
        radial-gradient(ellipse 24px 28px at 2.03rem 2.11rem, #ffffff 0 96%, transparent 100%),
        transparent;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sidenav-panel::after {
      content: 'Molinos del Atlántico\\A Gestión eventos';
      white-space: pre;
      position: absolute;
      top: 0.9rem;
      left: 3.65rem;
      right: 0.85rem;
      color: #FCEDD9;
      font-size: 0.72rem;
      line-height: 1.25;
      font-weight: 400;
      pointer-events: none;
    }
    .sidenav-panel::after::first-line {
      font-weight: 700;
    }
    .nav-list {
      height: calc(100vh - 64px);
      padding: 0.8rem 0.65rem 3.25rem;
      box-sizing: border-box;
      overflow-y: auto;
    }
    .nav-list a.mat-mdc-list-item {
      border-radius: 10px;
      margin-bottom: 3px;
      min-height: 42px;
      color: rgba(248, 250, 252, 0.82);
      --mdc-list-list-item-label-text-color: rgba(248, 250, 252, 0.82);
      --mdc-list-list-item-leading-icon-color: rgba(248, 250, 252, 0.82);
      --mdc-list-list-item-hover-label-text-color: #ffffff;
      --mdc-list-list-item-hover-leading-icon-color: #ffffff;
      --mdc-list-list-item-focus-label-text-color: #ffffff;
      --mdc-list-list-item-focus-leading-icon-color: #ffffff;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }
    .nav-list a.mat-mdc-list-item:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
    }
    .nav-list a.mat-mdc-list-item.active {
      background: rgba(163, 127, 62, 0.18);
      color: #ffffff;
      box-shadow: inset 3px 0 0 #A37F3E;
      --mdc-list-list-item-label-text-color: #ffffff;
      --mdc-list-list-item-leading-icon-color: #ffffff;
    }
    .nav-list a.mat-mdc-list-item.active mat-icon {
      color: #ffffff;
    }
    .nav-group {
      margin: 0.35rem 0 0.5rem;
      padding-top: 0.35rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .nav-group-title {
      padding: 0.35rem 0.85rem 0.45rem;
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(252, 237, 217, 0.62);
    }
    .nav-sub-item {
      padding-left: 0.25rem !important;
    }
    .nav-sub-item .mdc-list-item__primary-text {
      font-size: 0.9375rem;
    }
    .shell-content {
      min-height: 100vh;
      padding-top: 64px;
      background: #ffffff;
    }
    .shell-content .content {
      max-width: none;
      margin: 0;
      padding: 1.15rem 1.35rem 2rem;
    }
    @media (max-width: 959px) {
      .toolbar {
        left: 0;
        width: auto !important;
      }
      .user-chip {
        display: none;
      }
      .menu-btn {
        color: #FCEDD9;
      }
      .sidenav-panel {
        position: fixed;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
      }
    }
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(RealtimeService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly isHandset$ = this.breakpoint.observe(Breakpoints.Handset).pipe(map((s) => s.matches));

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'notifications')) {
        this.notifications.refreshCount();
      }
    });
  }

  ngOnInit(): void {
    this.auth.loadPermissions();
    this.notifications.startPolling();
    this.realtime.connect();
  }

  ngOnDestroy(): void {
    this.notifications.stopPolling();
    this.realtime.disconnect();
  }
}
