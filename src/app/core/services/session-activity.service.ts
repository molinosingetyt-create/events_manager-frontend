import { Injectable, signal } from '@angular/core';

/** Ventana: si hubo actividad (UI o API) en este intervalo, se permite renovar el access token. */
export const ACTIVITY_WINDOW_MS = 30 * 60 * 1000;

const RECORD_THROTTLE_MS = 10_000;

/**
 * Última interacción del usuario o tráfico autenticado hacia la API.
 * Evita renovar el token si la sesión está inactiva (debe volver a iniciar sesión).
 */
@Injectable({ providedIn: 'root' })
export class SessionActivityService {
  private readonly lastActivityAt = signal<number>(Date.now());
  private throttleUntil = 0;
  private listeners: Array<{ type: string; fn: EventListener }> = [];

  /** Tiempo restante hasta que deje de considerarse “sesión activa” para renovar tokens. */
  msUntilInactive(): number {
    const elapsed = Date.now() - this.lastActivityAt();
    return Math.max(0, ACTIVITY_WINDOW_MS - elapsed);
  }

  isActiveForRefresh(): boolean {
    return Date.now() - this.lastActivityAt() < ACTIVITY_WINDOW_MS;
  }

  /** Llamar ante eventos de UI o respuestas HTTP (con throttle). */
  recordActivity(): void {
    const now = Date.now();
    if (now < this.throttleUntil) {
      return;
    }
    this.throttleUntil = now + RECORD_THROTTLE_MS;
    this.lastActivityAt.set(now);
  }

  /** Sin throttle: al iniciar sesión o tras login. */
  touchNow(): void {
    const now = Date.now();
    this.throttleUntil = 0;
    this.lastActivityAt.set(now);
  }

  startUiTracking(): void {
    this.stopUiTracking();
    const handler = (): void => this.recordActivity();
    const opts: AddEventListenerOptions = { passive: true };
    for (const type of ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const) {
      window.addEventListener(type, handler, opts);
      this.listeners.push({ type, fn: handler });
    }
    this.touchNow();
  }

  stopUiTracking(): void {
    for (const { type, fn } of this.listeners) {
      window.removeEventListener(type, fn);
    }
    this.listeners = [];
  }
}
