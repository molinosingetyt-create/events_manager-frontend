import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, finalize, map, Observable, share, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { User } from '../models/user';
import { SessionActivityService } from './session-activity.service';
import { decodeJwtPayload } from '../utils/jwt';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** Renovar access token cuando falten a lo sumo estos segundos (coincide con ventana útil típica). */
const REFRESH_BEFORE_EXPIRY_SEC = 5 * 60;
const PROACTIVE_CHECK_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl;
  private readonly sessionActivity = inject(SessionActivityService);
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;
  private refreshInFlight: Observable<TokenPair> | null = null;

  readonly user = signal<User | null>(null);

  /** Códigos de permiso efectivos del perfil (p. ej. `users.view`, `employees.edit`). */
  readonly permissionCodes = signal<ReadonlySet<string>>(new Set());

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.restoreFromStorage();
    this.restorePermissionsFromStorage();
    if (localStorage.getItem('access_token')) {
      this.startSessionMaintenance();
    }
  }

  private restoreFromStorage(): void {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        this.user.set(JSON.parse(raw) as User);
      } catch {
        localStorage.removeItem('user');
      }
    }
  }

  private restorePermissionsFromStorage(): void {
    const raw = localStorage.getItem('permission_codes');
    if (!raw) {
      return;
    }
    try {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) {
        this.permissionCodes.set(new Set(arr));
      }
    } catch {
      localStorage.removeItem('permission_codes');
    }
  }

  /** True si existe algún permiso cuyo código sea exactamente `code` o empiece por `namespace.` (p. ej. `users` → `users.view`). */
  hasPermissionInNamespace(namespace: string): boolean {
    const set = this.permissionCodes();
    const prefix = `${namespace}.`;
    for (const c of set) {
      if (c === namespace || c.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  hasAnyPermission(codes: readonly string[]): boolean {
    const set = this.permissionCodes();
    return codes.some((c) => set.has(c));
  }

  private setPermissionCodes(codes: string[]): void {
    this.permissionCodes.set(new Set(codes));
    localStorage.setItem('permission_codes', JSON.stringify(codes));
  }

  /** Sincroniza permisos con la respuesta del API (login, guard, refresco). */
  syncPermissionsFromResponse(rows: { code: string }[]): void {
    this.setPermissionCodes(rows.map((r) => r.code));
  }

  /** Refresca permisos desde el servidor (útil tras F5 o cambios de perfil). */
  loadPermissions(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.permissionCodes.set(new Set());
      return;
    }
    this.http.get<{ code: string }[]>(`${this.base}/users/me/permissions`).subscribe({
      next: (rows) => this.syncPermissionsFromResponse(rows),
      error: () => this.permissionCodes.set(new Set()),
    });
  }

  login(payload: LoginPayload): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${this.base}/auth/login`, payload).pipe(
      tap((tokens) => {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
        this.startSessionMaintenance();
      }),
      switchMap((tokens) =>
        forkJoin({
          u: this.http.get<User>(`${this.base}/users/me`),
          perms: this.http.get<{ code: string }[]>(`${this.base}/users/me/permissions`),
        }).pipe(
          tap(({ u, perms }) => {
            this.user.set(u);
            localStorage.setItem('user', JSON.stringify(u));
            this.syncPermissionsFromResponse(perms);
          }),
          map(() => tokens),
        ),
      ),
    );
  }

  loadMe(): void {
    forkJoin({
      u: this.http.get<User>(`${this.base}/users/me`),
      perms: this.http.get<{ code: string }[]>(`${this.base}/users/me/permissions`),
    }).subscribe({
      next: ({ u, perms }) => {
        this.user.set(u);
        localStorage.setItem('user', JSON.stringify(u));
        this.syncPermissionsFromResponse(perms);
      },
      error: () => this.logout(),
    });
  }

  logout(): void {
    this.stopSessionMaintenance();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permission_codes');
    this.user.set(null);
    this.permissionCodes.set(new Set());
    void this.router.navigate(['/login']);
  }

  /**
   * Una sola petición de refresh concurrente (timer + 401 + varias pestañas).
   */
  refreshDeduped(): Observable<TokenPair> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refresh().pipe(
        finalize(() => {
          this.refreshInFlight = null;
        }),
        share(),
      );
    }
    return this.refreshInFlight;
  }

  refresh(): Observable<TokenPair> {
    const rt = localStorage.getItem('refresh_token');
    return this.http.post<TokenPair>(`${this.base}/auth/refresh`, { refresh_token: rt }).pipe(
      tap((tokens) => {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }),
    );
  }

  startSessionMaintenance(): void {
    this.stopSessionMaintenance();
    this.sessionActivity.startUiTracking();
    this.sessionActivity.touchNow();
    this.maintenanceTimer = setInterval(() => this.checkProactiveRefresh(), PROACTIVE_CHECK_MS);
    queueMicrotask(() => this.checkProactiveRefresh());
  }

  stopSessionMaintenance(): void {
    if (this.maintenanceTimer != null) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
    this.sessionActivity.stopUiTracking();
  }

  private checkProactiveRefresh(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (exp == null) {
      return;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const secondsLeft = exp - nowSec;
    if (secondsLeft > REFRESH_BEFORE_EXPIRY_SEC) {
      return;
    }
    if (!this.sessionActivity.isActiveForRefresh()) {
      return;
    }
    if (!localStorage.getItem('refresh_token')) {
      return;
    }
    this.refreshDeduped().subscribe({
      error: () => this.logout(),
    });
  }

  hasAnyRole(roles: string[]): boolean {
    const r = this.user()?.role;
    return !!r && roles.includes(r);
  }

  hasRole(role: string): boolean {
    return this.user()?.role === role;
  }
}
