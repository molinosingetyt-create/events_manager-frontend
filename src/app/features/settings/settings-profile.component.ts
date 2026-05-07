import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';

interface MePermission {
  code: string;
  name: string;
}

@Component({
  selector: 'em-settings-profile',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslateLabelPipe],
  template: `
    <div class="page-head">
      <h1>Perfil y permisos</h1>
      <p class="page-lead">
        Resumen de tu cuenta y los permisos efectivos que aplica el servidor a tu perfil.
      </p>
    </div>

    @if (auth.user(); as u) {
      <mat-card class="user-card">
        <mat-card-content>
          <div class="user-head">
            <mat-icon class="user-avatar" aria-hidden="true">account_circle</mat-icon>
            <div class="user-text">
              <h2 class="user-name">{{ u.name }}</h2>
              <p class="user-email">{{ u.email }}</p>
              <p class="user-role">
                Perfil: <strong>{{ u.role | translateLabel: 'role' }}</strong>
                · Estado: {{ u.status | translateLabel: 'entityStatus' }}
              </p>
              <p class="user-meta">Id. usuario: {{ u.id }} · Id. área asignada: {{ u.area_id }}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="perm-card">
        <mat-card-content>
          <h3 class="perm-title">Permisos asignados</h3>
          <p class="perm-hint">
            <mat-icon inline>verified</mat-icon>
            Nombres según el catálogo del sistema (pasa el cursor por un ítem para ver el código técnico).
          </p>
          @if (loadingPerms()) {
            <p class="muted">Cargando permisos…</p>
          } @else if (!perms().length) {
            <p class="muted">No se recibieron permisos.</p>
          } @else {
            <ul class="perm-list">
              @for (p of perms(); track p.code) {
                <li [attr.title]="p.code">{{ p.name }}</li>
              }
            </ul>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .user-card {
      margin-bottom: 1rem;
    }
    .user-head {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .user-avatar {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: var(--em-brand-navy, #0066CC);
      flex-shrink: 0;
    }
    .user-name {
      margin: 0 0 0.25rem;
      font-size: 1.35rem;
      font-weight: 700;
    }
    .user-email {
      margin: 0 0 0.5rem;
      color: #103847;
      font-size: 0.95rem;
    }
    .user-role {
      margin: 0 0 0.35rem;
      font-size: 0.9rem;
    }
    .user-meta {
      margin: 0;
      font-size: 0.8125rem;
      color: #103847;
    }
    .perm-title {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .perm-hint {
      display: flex;
      gap: 0.35rem;
      align-items: flex-start;
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: #103847;
      line-height: 1.45;
    }
    .perm-hint mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .perm-list {
      margin: 0;
      padding-left: 1.25rem;
      columns: 2;
      column-gap: 2rem;
    }
    .perm-list li {
      break-inside: avoid;
      font-size: 0.9rem;
      line-height: 1.5;
      font-weight: 500;
      color: #103847;
    }
    .muted {
      color: #103847;
      font-size: 0.9rem;
    }
  `,
})
export class SettingsProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly perms = signal<MePermission[]>([]);
  readonly loadingPerms = signal(true);

  ngOnInit(): void {
    this.api.get<MePermission[]>('/users/me/permissions').subscribe({
      next: (p) => {
        this.perms.set(p);
        this.loadingPerms.set(false);
      },
      error: () => this.loadingPerms.set(false),
    });
  }
}
