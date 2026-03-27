import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { User } from '../models/user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl;
  readonly user = signal<User | null>(null);

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.restoreFromStorage();
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

  login(payload: LoginPayload): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${this.base}/auth/login`, payload).pipe(
      tap((tokens) => {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }),
      switchMap((tokens) =>
        this.http.get<User>(`${this.base}/users/me`).pipe(
          tap((u) => {
            this.user.set(u);
            localStorage.setItem('user', JSON.stringify(u));
          }),
          map(() => tokens),
        ),
      ),
    );
  }

  loadMe(): void {
    this.http.get<User>(`${this.base}/users/me`).subscribe({
      next: (u) => {
        this.user.set(u);
        localStorage.setItem('user', JSON.stringify(u));
      },
      error: () => this.logout(),
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.user.set(null);
    void this.router.navigate(['/login']);
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

  hasAnyRole(roles: string[]): boolean {
    const r = this.user()?.role;
    return !!r && roles.includes(r);
  }

  hasRole(role: string): boolean {
    return this.user()?.role === role;
  }
}
