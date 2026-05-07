import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { RBAC_DIALOG_MAX_HEIGHT, RBAC_DIALOG_WIDTH } from './rbac-dialog.constants';
import type { ProfileRow } from './settings-profile.model';
import { SettingsRbacPermissionsDialogComponent } from './settings-rbac-permissions-dialog.component';

@Component({
  selector: 'em-settings-rbac',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    RouterLink,
  ],
  template: `
    <div class="page-head">
      <h1>Perfiles y permisos</h1>
      <p class="page-lead">
        Elige un perfil para editarlo o crea uno nuevo: se abrirá un asistente en pantalla completa (paso 1: datos, paso
        2: permisos). El catálogo global de permisos del sistema está en un apartado separado.
      </p>
    </div>

    <mat-card class="block">
      <mat-card-content>
        <div class="block-head">
          <h2>Perfiles</h2>
          <div class="actions">
            <button mat-stroked-button type="button" (click)="openPermissionsCatalog()" [disabled]="loading">
              <mat-icon>list_alt</mat-icon>
              Catálogo de permisos
            </button>
            <a mat-flat-button color="primary" routerLink="nuevo" [class.disabled]="loading">
              <mat-icon>add</mat-icon>
              Nuevo perfil
            </a>
          </div>
        </div>

        <div class="table-wrap">
          <table mat-table [dataSource]="profiles" class="full">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Código</th>
              <td mat-cell *matCellDef="let r">{{ r.code }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let r">{{ r.name }}</td>
            </ng-container>
            <ng-container matColumnDef="behavior">
              <th mat-header-cell *matHeaderCellDef>Comportamiento</th>
              <td mat-cell *matCellDef="let r">{{ r.behavior_key }}</td>
            </ng-container>
            <ng-container matColumnDef="system">
              <th mat-header-cell *matHeaderCellDef>Sistema</th>
              <td mat-cell *matCellDef="let r">{{ r.is_system ? 'Sí' : 'No' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let r">
                <div class="action-row">
                  <a
                    mat-icon-button
                    class="action-btn-edit"
                    [routerLink]="[r.id, 'editar']"
                    matTooltip="Editar perfil y permisos"
                    matTooltipPosition="above"
                    aria-label="Editar perfil y permisos"
                    [class.disabled]="loading"
                  >
                    <mat-icon>edit</mat-icon>
                  </a>
                  @if (!r.is_system) {
                    <button
                      mat-icon-button
                      type="button"
                      class="action-btn-delete"
                      (click)="deleteProfileRow(r)"
                      matTooltip="Eliminar perfil"
                      matTooltipPosition="above"
                      aria-label="Eliminar perfil"
                      [disabled]="loading"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="profColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: profColumns"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .block {
      margin-bottom: 1.25rem;
    }
    .block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .block-head h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .table-wrap {
      overflow-x: auto;
    }
    .full {
      width: 100%;
    }
    a.disabled {
      pointer-events: none;
      opacity: 0.5;
    }
  `,
})
export class SettingsRbacComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly realtime = inject(RealtimeService);

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'rbac')) {
        this.reloadProfiles();
      }
    });
  }

  loading = false;
  profiles: ProfileRow[] = [];
  profColumns = ['code', 'name', 'behavior', 'system', 'actions'];

  ngOnInit(): void {
    this.reloadProfiles();
  }

  reloadProfiles(): void {
    this.loading = true;
    this.api.get<ProfileRow[]>('/security/profiles').subscribe({
      next: (pr) => {
        this.profiles = pr;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openPermissionsCatalog(): void {
    this.dialog.open(SettingsRbacPermissionsDialogComponent, {
      width: RBAC_DIALOG_WIDTH,
      maxHeight: RBAC_DIALOG_MAX_HEIGHT,
      autoFocus: false,
    });
  }

  deleteProfileRow(row: ProfileRow): void {
    if (!confirm(`¿Eliminar el perfil «${row.name}»? No debe haber usuarios asignados.`)) {
      return;
    }
    this.loading = true;
    this.api.delete(`/security/profiles/${row.id}`).subscribe({
      next: () => this.reloadProfiles(),
      error: () => (this.loading = false),
    });
  }
}
