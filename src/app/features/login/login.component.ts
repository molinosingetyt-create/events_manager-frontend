import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'em-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="wrap">
      <div class="login-shell">
        <aside class="brand-aside" aria-label="Marca">
          <div class="brand-logo-frame">
            <img
              class="brand-logo"
              src="assets/logo-la-nieve.svg"
              width="180"
              height="220"
              alt="Molinos del Atlántico · La Nieve"
              decoding="async" />
          </div>
          <p class="brand-title">Gestión de eventos</p>
          <p class="brand-sub">Acceso corporativo</p>
        </aside>

        <div class="panel">
          <div class="card">
            <h2 class="title">Iniciar sesión</h2>
            <p class="subtitle">Introduce tus credenciales corporativas</p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form" autocomplete="on">
              <div class="field">
                <label for="email" class="label">Correo electrónico</label>
                <div class="input-wrap" [class.error]="isInvalid('email')">
                  <mat-icon class="left-icon">mail</mat-icon>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    autocomplete="username"
                    placeholder="nombre@molinosdelatlantico.com"
                    class="native-input" />
                </div>
                <p *ngIf="isInvalid('email')" class="err-msg">
                  Ingresa un correo válido
                </p>
              </div>

              <div class="field">
                <label for="password" class="label">Contraseña</label>
                <div class="input-wrap" [class.error]="isInvalid('password')">
                  <mat-icon class="left-icon">lock</mat-icon>
                  <input
                    id="password"
                    [type]="showPass() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="native-input" />
                  <button
                    type="button"
                    class="right-icon"
                    (click)="showPass.set(!showPass())"
                    [attr.aria-label]="showPass() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                    <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                </div>
                <p *ngIf="isInvalid('password')" class="err-msg">
                  Contraseña inválida (mínimo 6 caracteres)
                </p>
              </div>

              <button
                type="submit"
                class="submit"
                [disabled]="form.invalid || loading()">
                <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
                <mat-icon *ngIf="!loading()">login</mat-icon>
                <span *ngIf="!loading()">Entrar</span>
              </button>
            </form>
          </div>

          <p class="footer-note">Si tienes problemas para entrar, contacta a talento humano o administración.</p>
        </div>
      </div>

      <footer class="copyright">
        © {{ year }} Molinos del Atlántico · La Nieve — Acceso restringido
      </footer>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background:
        radial-gradient(1000px 520px at 8% -8%, rgba(0, 102, 204, 0.45), transparent 52%),
        radial-gradient(800px 480px at 100% 15%, rgba(221, 10, 30, 0.18), transparent 48%),
        radial-gradient(600px 400px at 50% 100%, rgba(163, 127, 62, 0.08), transparent 45%),
        linear-gradient(165deg, #103847 0%, #0066CC 42%, #103847 100%);
    }
    .login-shell {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: clamp(2rem, 5vw, 4.25rem);
      width: 100%;
      max-width: 900px;
    }
    .brand-aside {
      flex: 0 1 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: #FCEDD9;
      padding: 0.5rem 1rem;
    }
    .brand-logo-frame {
      width: min(70vw, 240px);
      aspect-ratio: 4 / 5;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.4rem;
      background: #ffffff;
      border-radius: 50% / 42%;
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(252, 237, 217, 0.35);
    }
    .brand-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .brand-title {
      margin: 1.4rem 0 0;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      margin: 0.35rem 0 0;
      font-size: 0.875rem;
      opacity: 0.85;
      max-width: 240px;
    }
    .panel {
      flex: 0 1 455px;
      min-width: 0;
      width: 100%;
    }

    .card {
      background: #ffffff;
      border-radius: 22px;
      border: 1px solid rgba(252, 237, 217, 0.95);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
      padding: clamp(1.35rem, 2.4vw, 1.75rem);
    }
    .title {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #0066CC;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 0.25rem 0 1rem;
      font-size: 0.84rem;
      color: #103847;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #0066CC;
    }
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1.5px solid #FCEDD9;
      border-radius: 10px;
      height: 44px;
      padding: 0 0.7rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input-wrap:focus-within {
      border-color: #0066CC;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.12);
    }
    .input-wrap.error {
      border-color: #DD0A1E;
    }
    .input-wrap.error:focus-within {
      box-shadow: 0 0 0 3px rgba(221, 10, 30, 0.15);
    }
    .left-icon {
      color: #94a0b8;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 0.5rem;
      flex: none;
    }
    .native-input {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 100%;
      border: 0;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 0.9rem;
      color: #103847;
      padding: 0;
    }
    .native-input::placeholder {
      color: #a1a9bb;
    }
    .native-input:-webkit-autofill,
    .native-input:-webkit-autofill:hover,
    .native-input:-webkit-autofill:focus,
    .native-input:-webkit-autofill:active {
      -webkit-text-fill-color: #103847 !important;
      -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
      box-shadow: 0 0 0 1000px #ffffff inset !important;
      caret-color: #103847 !important;
      transition: background-color 9999s ease-in-out 0s;
    }
    .right-icon {
      border: 0;
      background: transparent;
      color: #103847;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 6px;
      flex: none;
    }
    .right-icon:hover {
      background: #eef1f7;
      color: #0066CC;
    }
    .right-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .err-msg {
      margin: 0;
      font-size: 0.75rem;
      color: #DD0A1E;
      font-weight: 500;
    }
    .submit {
      width: 100%;
      height: 46px;
      margin-top: 0.5rem;
      border: 0;
      border-radius: 10px;
      background: #0066CC;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.01em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      transition: background 0.15s, opacity 0.15s;
    }
    .submit mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .submit:hover:not([disabled]) {
      background: #103847;
    }
    .submit[disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .footer-note {
      margin: 1.25rem 0 0;
      font-size: 0.8rem;
      color: rgba(248, 250, 252, 0.7);
      text-align: left;
      line-height: 1.4;
    }
    .copyright {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: rgba(248, 250, 252, 0.55);
      letter-spacing: 0.02em;
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
      .brand-logo-frame {
        width: 165px;
        padding: 0.9rem;
      }
      .footer-note {
        text-align: center;
      }
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly showPass = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isInvalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Credenciales inválidas', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
