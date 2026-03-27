import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

export interface AppNotificationRow {
  id: number;
  kind: string;
  message: string;
  overtime_request_id: number | null;
  read_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly unreadCount = signal(0);
  readonly items = signal<AppNotificationRow[]>([]);
  readonly loading = signal(false);

  private pollId: ReturnType<typeof setInterval> | null = null;

  startPolling(): void {
    if (this.pollId != null) {
      return;
    }
    this.refreshCount();
    this.pollId = setInterval(() => this.refreshCount(), 30_000);
  }

  stopPolling(): void {
    if (this.pollId != null) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  refreshCount(): void {
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: (r) => this.unreadCount.set(r.count),
      error: () => {},
    });
  }

  loadUnreadList(): void {
    this.loading.set(true);
    this.api.get<AppNotificationRow[]>('/notifications', { unread_only: true }).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markAllRead(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.api.post<{ ok: boolean }>('/notifications/read-all', {}).subscribe({
      next: () => {
        this.items.set([]);
        this.unreadCount.set(0);
      },
    });
  }

  openNotification(n: AppNotificationRow, ev: Event): void {
    ev.stopPropagation();
    this.api.post<AppNotificationRow>(`/notifications/${n.id}/read`, {}).subscribe({
      next: () => {
        this.unreadCount.update((c) => Math.max(0, c - 1));
        this.items.update((list) => list.filter((x) => x.id !== n.id));
        void this.router.navigate(['/app/overtime']);
      },
    });
  }

  onMenuClosed(): void {
    this.refreshCount();
  }

  clear(): void {
    this.unreadCount.set(0);
    this.items.set([]);
  }
}
