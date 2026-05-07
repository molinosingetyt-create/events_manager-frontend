import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

@Component({
  selector: 'em-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, RouterLink, TranslateLabelPipe],
  template: `
    <header class="hero">
      <div class="hero-text">
        <h1>
          Hola@if (auth.user()?.name; as userName) {
            , {{ userName }}
          }
        </h1>
        <p class="page-lead">
          Tu rol: <strong>{{ auth.user()?.role | translateLabel: 'role' }}</strong>
          · Usa el menú lateral o los accesos de abajo para trabajar.
        </p>
      </div>
    </header>

    <section class="grid" aria-label="Accesos rápidos">
      <a class="tile" routerLink="/app/configuracion/perfil">
        <mat-icon class="tile-icon" aria-hidden="true">person</mat-icon>
        <span class="tile-title">Perfil y permisos</span>
        <span class="tile-desc">Tu cuenta y qué puedes hacer en cada módulo</span>
      </a>
      @if (auth.hasPermissionInNamespace('users')) {
        <a class="tile" routerLink="/app/users">
          <mat-icon class="tile-icon" aria-hidden="true">group</mat-icon>
          <span class="tile-title">Usuarios</span>
          <span class="tile-desc">Cuentas, roles y permisos</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('security')) {
        <a class="tile" routerLink="/app/configuracion/seguridad">
          <mat-icon class="tile-icon" aria-hidden="true">admin_panel_settings</mat-icon>
          <span class="tile-title">Perfiles y permisos</span>
          <span class="tile-desc">Administración de seguridad</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('areas')) {
        <a class="tile" routerLink="/app/areas">
          <mat-icon class="tile-icon" aria-hidden="true">domain</mat-icon>
          <span class="tile-title">Áreas</span>
          <span class="tile-desc">Estructura organizativa</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('catalog')) {
        <a class="tile" routerLink="/app/configuracion/temporal">
          <mat-icon class="tile-icon" aria-hidden="true">more_time</mat-icon>
          <span class="tile-title">Catálogos incapacidad</span>
          <span class="tile-desc">Temporal, EPS/ARL y diagnósticos</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('employees')) {
        <a class="tile" routerLink="/app/employees">
          <mat-icon class="tile-icon" aria-hidden="true">badge</mat-icon>
          <span class="tile-title">Empleados</span>
          <span class="tile-desc">Datos y puestos</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('overtime')) {
        <a class="tile" routerLink="/app/overtime">
          <mat-icon class="tile-icon" aria-hidden="true">schedule</mat-icon>
          <span class="tile-title">Horas extra</span>
          <span class="tile-desc">Solicitudes y aprobaciones</span>
        </a>
      }
      @if (auth.hasPermissionInNamespace('incapacity')) {
        <a class="tile" routerLink="/app/incapacity">
          <mat-icon class="tile-icon" aria-hidden="true">healing</mat-icon>
          <span class="tile-title">Incapacidad</span>
          <span class="tile-desc">Registro y seguimiento</span>
        </a>
      }
    </section>

    <mat-card class="hint-card">
      <mat-card-content>
        <mat-icon class="hint-icon" aria-hidden="true">tips_and_updates</mat-icon>
        <p>
          Los módulos y acciones visibles dependen de los <strong>permisos de tu perfil</strong> (no solo del
          nombre del rol). Si falta alguna opción, contacta al administrador del sistema.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .hero {
      margin-bottom: 1.25rem;
    }
    .hero h1 {
      font-size: clamp(1.35rem, 2vw, 1.65rem);
      font-weight: 700;
      margin: 0 0 0.45rem;
      letter-spacing: -0.02em;
      line-height: 1.18;
      color: #103847;
    }
    .hero .page-lead {
      margin: 0;
      max-width: 56ch;
      font-size: 0.86rem;
      color: rgba(16, 56, 71, 0.82);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-height: 104px;
      padding: 1rem 1.05rem;
      border-radius: 10px;
      border: 1px solid rgba(16, 56, 71, 0.08);
      background: #fff;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 2px 10px rgba(16, 56, 71, 0.05);
      transition:
        box-shadow 0.2s ease,
        border-color 0.2s ease,
        transform 0.15s ease;
    }
    .tile:hover {
      border-color: rgba(0, 102, 204, 0.22);
      box-shadow: 0 8px 20px rgba(0, 102, 204, 0.1);
      transform: translateY(-1px);
    }
    .tile:focus-visible {
      outline: 2px solid var(--em-brand-gold, #A37F3E);
      outline-offset: 2px;
    }
    .tile-icon {
      font-size: 22px;
      width: 34px;
      height: 34px;
      color: var(--em-brand-navy, #0066CC);
      margin-bottom: 0.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(0, 102, 204, 0.08);
    }
    .tile-title {
      font-weight: 600;
      font-size: 0.92rem;
      margin-bottom: 0.25rem;
      color: #103847;
    }
    .tile-desc {
      font-size: 0.76rem;
      color: rgba(16, 56, 71, 0.72);
      line-height: 1.4;
    }
    .hint-card {
      border: 1px solid rgba(16, 56, 71, 0.08);
      box-shadow: 0 2px 10px rgba(16, 56, 71, 0.04) !important;
    }
    .hint-card mat-card-content {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      padding: 0.85rem 1rem !important;
    }
    .hint-icon {
      color: #A37F3E;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .hint-card p {
      margin: 0;
      font-size: 0.8rem;
      color: rgba(16, 56, 71, 0.82);
      line-height: 1.45;
    }
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
}
