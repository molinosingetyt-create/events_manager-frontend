import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
          @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
            <a mat-list-item routerLink="/app/users" routerLinkActive="active">
              <mat-icon matListItemIcon>group</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
            <a mat-list-item routerLink="/app/areas" routerLinkActive="active">
              <mat-icon matListItemIcon>domain</mat-icon>
              <span matListItemTitle>Áreas</span>
            </a>
          }
          <a mat-list-item routerLink="/app/employees" routerLinkActive="active">
            <mat-icon matListItemIcon>badge</mat-icon>
            <span matListItemTitle>Empleados</span>
          </a>
          <a mat-list-item routerLink="/app/overtime" routerLinkActive="active">
            <mat-icon matListItemIcon>schedule</mat-icon>
            <span matListItemTitle>Horas extra</span>
          </a>
          <a mat-list-item routerLink="/app/incapacity" routerLinkActive="active">
            <mat-icon matListItemIcon>healing</mat-icon>
            <span matListItemTitle>Incapacidades y notas</span>
          </a>
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
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 4;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .brand-mark {
      width: 8px;
      height: 28px;
      border-radius: 4px;
      background: linear-gradient(180deg, #1a2b6d 0%, #e31e24 100%);
      box-shadow: 0 0 10px rgba(26, 43, 109, 0.35);
    }
    .title {
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }
    .spacer {
      flex: 1;
    }
    .notif-trigger {
      margin-right: 0.15rem;
    }
    .user-chip {
      margin-right: 0.65rem;
      font-size: 0.8125rem;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.92;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
    }
    .logout-btn {
      --mdc-filled-button-container-color: #ffffff;
      --mdc-filled-button-label-text-color: #1a2b6d;
      background-color: #fff !important;
      color: #1a2b6d !important;
      font-weight: 600;
      border-radius: 999px;
      padding: 0 1rem;
      min-height: 36px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
    }
    .logout-btn .mdc-button__label,
    .logout-btn .mat-mdc-button-touch-target {
      color: inherit;
    }
    .logout-btn:hover {
      --mdc-filled-button-hover-state-layer-color: rgba(26, 43, 109, 0.1);
      background-color: #f4f6fa !important;
      color: #121e4d !important;
    }
    .shell {
      min-height: calc(100vh - 64px);
    }
    .sidenav-panel {
      width: 268px;
      border-right: 1px solid var(--em-border, #e2e6ef);
      background: #fff;
    }
    .nav-list {
      padding: 0.75rem 0.5rem;
    }
    .nav-list a.mat-mdc-list-item {
      border-radius: 10px;
      margin-bottom: 2px;
    }
    .nav-list a.mat-mdc-list-item.active {
      background: rgba(26, 43, 109, 0.08);
      color: #1a2b6d;
      box-shadow: inset 3px 0 0 #d4a037;
    }
    .nav-list a.mat-mdc-list-item.active mat-icon {
      color: #d4a037;
    }
    @media (max-width: 959px) {
      .user-chip {
        display: none;
      }
    }
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly isHandset$ = this.breakpoint.observe(Breakpoints.Handset).pipe(map((s) => s.matches));

  ngOnInit(): void {
    this.notifications.startPolling();
  }

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }
}
