import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';

interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  sort_order: number;
}

@Component({
  selector: 'em-settings-rbac-permissions-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Catálogo de permisos</h2>
    <mat-dialog-content class="dlg">
      <p class="lead">
        Permisos disponibles para asignar a los perfiles. Los del sistema no se pueden eliminar.
      </p>
      @if (formVisible) {
        <form [formGroup]="permForm" class="perm-form" (ngSubmit)="savePermission()">
          <mat-form-field appearance="outline" class="field-block">
            <mat-label>Código</mat-label>
            <input matInput formControlName="code" placeholder="ej. informes.export" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field-block">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field-block">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
          <div class="perm-form-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="permForm.invalid || loading">Guardar</button>
            <button mat-button type="button" (click)="cancelPermForm()">Cancelar</button>
          </div>
        </form>
      } @else {
        <button mat-stroked-button type="button" (click)="startNewPermission()" [disabled]="loading">
          <mat-icon>add</mat-icon>
          Nuevo permiso
        </button>
      }

      <div class="table-wrap">
        <table mat-table [dataSource]="permissions" class="full">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let r">{{ r.code }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let r">{{ r.name }}</td>
          </ng-container>
          <ng-container matColumnDef="system">
            <th mat-header-cell *matHeaderCellDef>Sistema</th>
            <td mat-cell *matCellDef="let r">{{ r.is_system ? 'Sí' : 'No' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let r">
              <div class="action-row">
                @if (!r.is_system) {
                  <button
                    mat-icon-button
                    type="button"
                    class="action-btn-delete"
                    (click)="deletePermissionRow(r)"
                    matTooltip="Eliminar permiso"
                    matTooltipPosition="above"
                    aria-label="Eliminar permiso"
                    [disabled]="loading"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close type="button">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    /* Ancho coherente con otros diálogos RBAC (rbac-dialog.constants) */
    .dlg {
      min-width: min(96vw, 560px);
      max-width: 720px;
      padding-top: 0.5rem !important;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .lead {
      margin: 0 0 1rem;
      font-size: 0.9rem;
      color: #103847;
      line-height: 1.45;
    }
    .perm-form {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #FCEDD9;
    }
    .field-block {
      width: 100%;
    }
    .perm-form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.25rem;
    }
    .table-wrap {
      max-height: min(50vh, 360px);
      overflow: auto;
      width: 100%;
    }
    .full {
      width: 100%;
      table-layout: fixed;
    }
    .full .mat-column-code {
      width: 28%;
      word-break: break-word;
    }
    .full .mat-column-name {
      width: 52%;
      word-break: break-word;
    }
    .full .mat-column-system {
      width: 12%;
    }
    .full .mat-column-actions {
      width: 8%;
      text-align: right;
    }
  `,
})
export class SettingsRbacPermissionsDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly realtime = inject(RealtimeService);

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'rbac')) {
        this.load();
      }
    });
  }

  loading = false;
  permissions: PermissionRow[] = [];
  columns = ['code', 'name', 'system', 'actions'];
  formVisible = false;

  readonly permForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]+$/)]],
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<PermissionRow[]>('/security/permissions').subscribe({
      next: (rows) => {
        this.permissions = rows;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  startNewPermission(): void {
    this.permForm.reset({ code: '', name: '', description: '' });
    this.formVisible = true;
  }

  cancelPermForm(): void {
    this.formVisible = false;
  }

  savePermission(): void {
    if (this.permForm.invalid) {
      return;
    }
    this.loading = true;
    const v = this.permForm.getRawValue();
    this.api
      .post<PermissionRow>('/security/permissions', {
        code: v.code,
        name: v.name,
        description: v.description || null,
      })
      .subscribe({
        next: () => {
          this.formVisible = false;
          this.load();
        },
        error: () => (this.loading = false),
      });
  }

  deletePermissionRow(row: PermissionRow): void {
    if (!confirm(`¿Eliminar el permiso «${row.code}»?`)) {
      return;
    }
    this.loading = true;
    this.api.delete(`/security/permissions/${row.id}`).subscribe({
      next: () => this.load(),
      error: () => (this.loading = false),
    });
  }
}
