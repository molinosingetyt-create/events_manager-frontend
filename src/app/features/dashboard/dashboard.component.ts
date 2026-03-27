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
      @if (auth.hasAnyRole(['ADMIN', 'HR'])) {
        <a class="tile" routerLink="/app/users">
          <mat-icon class="tile-icon" aria-hidden="true">group</mat-icon>
          <span class="tile-title">Usuarios</span>
          <span class="tile-desc">Cuentas, roles y permisos</span>
        </a>
        <a class="tile" routerLink="/app/areas">
          <mat-icon class="tile-icon" aria-hidden="true">domain</mat-icon>
          <span class="tile-title">Áreas</span>
          <span class="tile-desc">Estructura organizativa</span>
        </a>
      }
      <a class="tile" routerLink="/app/employees">
        <mat-icon class="tile-icon" aria-hidden="true">badge</mat-icon>
        <span class="tile-title">Empleados</span>
        <span class="tile-desc">Datos y puestos</span>
      </a>
      <a class="tile" routerLink="/app/overtime">
        <mat-icon class="tile-icon" aria-hidden="true">schedule</mat-icon>
        <span class="tile-title">Horas extra</span>
        <span class="tile-desc">Solicitudes y aprobaciones</span>
      </a>
      <a class="tile" routerLink="/app/incapacity">
        <mat-icon class="tile-icon" aria-hidden="true">healing</mat-icon>
        <span class="tile-title">Incapacidades</span>
        <span class="tile-desc">Notas e incapacidades</span>
      </a>
    </section>

    <mat-card class="hint-card">
      <mat-card-content>
        <mat-icon class="hint-icon" aria-hidden="true">tips_and_updates</mat-icon>
        <p>
          Las acciones disponibles dependen de tu rol. Si falta alguna opción, contacta al administrador del
          sistema.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .hero {
      margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      letter-spacing: -0.03em;
      color: #0f172a;
    }
    .hero .page-lead {
      margin: 0;
      max-width: 52ch;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 1.15rem 1.2rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      transition:
        box-shadow 0.2s ease,
        border-color 0.2s ease,
        transform 0.15s ease;
    }
    .tile:hover {
      border-color: rgba(26, 43, 109, 0.22);
      box-shadow: 0 6px 16px rgba(26, 43, 109, 0.12);
      transform: translateY(-2px);
    }
    .tile:focus-visible {
      outline: 2px solid var(--em-brand-gold, #d4a037);
      outline-offset: 2px;
    }
    .tile-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--em-brand-navy, #1a2b6d);
      margin-bottom: 0.65rem;
    }
    .tile-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }
    .tile-desc {
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.35;
    }
    .hint-card mat-card-content {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      padding: 1rem 1.15rem !important;
    }
    .hint-icon {
      color: #ca8a04;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .hint-card p {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.45;
    }
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
}
