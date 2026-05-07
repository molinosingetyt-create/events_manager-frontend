import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DataChangedMessage, isDataChangedMessage } from '../utils/realtime-tables';

const RECONNECT_MS = 3500;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly zone = inject(NgZone);
  private readonly dataChanged = new Subject<DataChangedMessage>();
  /** Eventos `data_changed` del servidor (tras crear/editar/borrar en otro cliente). */
  readonly dataChanged$ = this.dataChanged.asObservable();

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wantOpen = false;

  connect(): void {
    this.wantOpen = true;
    this.openSocket();
  }

  disconnect(): void {
    this.wantOpen = false;
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws != null) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private openSocket(): void {
    if (!this.wantOpen) {
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }
    const url = `${environment.wsRealtimeUrl}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onmessage = (ev: MessageEvent<string>) => {
      try {
        const raw = JSON.parse(ev.data) as unknown;
        if (isDataChangedMessage(raw)) {
          this.zone.run(() => this.dataChanged.next(raw));
        }
      } catch {
        /* ignorar */
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = () => {
      this.ws = null;
      if (this.wantOpen) {
        this.reconnectTimer = setTimeout(() => this.openSocket(), RECONNECT_MS);
      }
    };
  }
}
