import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'em-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="wrap">
      <div class="login-shell">
        <aside class="brand-aside" aria-label="Marca">
          <img
            class="brand-logo"
            src="/apple-touch-icon.png?v=2"
            width="180"
            height="180"
            alt="La Nieve"
            decoding="async"
          />
          <p class="brand-title">Gestión de eventos</p>
          <p class="brand-sub">Acceso corporativo</p>
        </aside>
        <div class="panel">
          <mat-card class="card">
            <mat-card-header>
              <mat-card-title>Iniciar sesión</mat-card-title>
              <mat-card-subtitle>Introduce tus credenciales</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="submit()">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Correo electrónico</mat-label>
                  <input matInput type="email" formControlName="email" autocomplete="username" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Contraseña</mat-label>
                  <input matInput type="password" formControlName="password" autocomplete="current-password" />
                </mat-form-field>
                <button mat-flat-button color="primary" class="submit" type="submit" [disabled]="form.invalid || loading">
                  @if (loading) {
                    <mat-spinner diameter="20" />
                  } @else {
                    Entrar
                  }
                </button>
              </form>
            </mat-card-content>
          </mat-card>
          <p class="footer-note">Si tienes problemas para entrar, contacta a talento humano o administración.</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background:
        radial-gradient(1000px 520px at 8% -8%, rgba(26, 43, 109, 0.45), transparent 52%),
        radial-gradient(800px 480px at 100% 15%, rgba(227, 30, 36, 0.18), transparent 48%),
        radial-gradient(600px 400px at 50% 100%, rgba(212, 160, 55, 0.08), transparent 45%),
        linear-gradient(165deg, #121e4d 0%, #1a2b6d 42%, #141c38 100%);
    }
    .login-shell {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 2.5rem;
      width: 100%;
      max-width: 920px;
    }
    .brand-aside {
      flex: 0 1 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: #f8fafc;
      padding: 0.5rem 1rem;
    }
    .brand-logo {
      width: 100%;
      max-width: 200px;
      height: auto;
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
      background: rgba(255, 255, 255, 0.06);
    }
    .brand-title {
      margin: 1rem 0 0;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      margin: 0.35rem 0 0;
      font-size: 0.875rem;
      opacity: 0.85;
    }
    .panel {
      flex: 0 1 420px;
      min-width: 0;
      width: 100%;
    }
    @media (max-width: 720px) {
      .login-shell {
        flex-direction: column;
        gap: 1.75rem;
      }
      .brand-aside {
        flex-basis: auto;
        padding-top: 0.25rem;
      }
      .brand-logo {
        max-width: 140px;
      }
      .footer-note {
        text-align: center;
      }
    }
    .card {
      border-radius: 14px !important;
      border: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25) !important;
    }
    .card mat-card-header {
      padding-bottom: 0.25rem;
    }
    mat-card-title {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
    }
    mat-card-subtitle {
      margin-top: 0.25rem !important;
      color: #64748b !important;
    }
    .full {
      width: 100%;
      display: block;
      margin-bottom: 0.35rem;
    }
    .submit {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.6rem 1rem !important;
      font-weight: 600 !important;
    }
    .footer-note {
      margin: 1.25rem 0 0;
      font-size: 0.8rem;
      color: rgba(248, 250, 252, 0.65);
      text-align: left;
      line-height: 1.4;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => void this.router.navigate(['/app/dashboard']),
      });
  }
}
