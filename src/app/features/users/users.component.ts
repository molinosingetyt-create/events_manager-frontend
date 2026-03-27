import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService, Paginated } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import type { User } from '../../core/models/user';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { UserCreateDialogComponent } from './user-create-dialog.component';
import { UserEditDialogComponent } from './user-edit-dialog.component';
import { UserViewDialogComponent } from './user-view-dialog.component';

@Component({
  selector: 'em-users',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslateLabelPipe,
  ],
  template: `
    <div class="page-head">
      <h1>Usuarios</h1>
      <div class="actions">
        <button mat-flat-button color="primary" type="button" (click)="openCreate()">
          <mat-icon>person_add</mat-icon>
          Nuevo usuario
        </button>
      </div>
      <p class="page-lead">Cuentas del sistema, roles y estado.</p>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let r">{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let r">{{ r.name }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Correo</th>
            <td mat-cell *matCellDef="let r">{{ r.email }}</td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let r">{{ r.role | translateLabel: 'role' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">{{ r.status | translateLabel: 'entityStatus' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let r">
              <div class="action-row">
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-view"
                  (click)="openView(r)"
                  matTooltip="Ver detalle del usuario"
                  matTooltipPosition="above"
                  aria-label="Ver detalle del usuario"
                >
                  <mat-icon>visibility</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-edit"
                  (click)="openEdit(r)"
                  matTooltip="Editar usuario"
                  matTooltipPosition="above"
                  aria-label="Editar usuario"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-delete"
                  (click)="deleteUser(r)"
                  matTooltip="Dar de baja (marca como inactivo)"
                  matTooltipPosition="above"
                  aria-label="Dar de baja usuario"
                >
                  <mat-icon>person_off</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator
          [length]="total"
          [pageIndex]="page - 1"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
        />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .full {
      min-width: 720px;
      width: 100%;
    }
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  rows: User[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  readonly columns = ['id', 'name', 'email', 'role', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(UserCreateDialogComponent, { width: 'min(96vw, 520px)' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
        }
      });
  }

  openView(row: User): void {
    this.dialog.open(UserViewDialogComponent, {
      width: 'min(96vw, 440px)',
      data: row,
    });
  }

  openEdit(row: User): void {
    this.dialog
      .open(UserEditDialogComponent, {
        width: 'min(96vw, 520px)',
        data: row.id,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.load();
          this.auth.loadMe();
        }
      });
  }

  deleteUser(row: User): void {
    if (!confirm(`¿Dar de baja al usuario «${row.name}»? (se marcará como inactivo)`)) {
      return;
    }
    this.api.delete(`/users/${row.id}`).subscribe({
      next: () => {
        this.load();
        if (this.auth.user()?.id === row.id) {
          this.auth.logout();
        }
      },
    });
  }

  load(): void {
    this.api
      .get<Paginated<User>>('/users', { page: this.page, page_size: this.pageSize })
      .subscribe((res) => {
        this.rows = res.items;
        this.total = res.total;
      });
  }

  onPage(ev: PageEvent): void {
    this.page = ev.pageIndex + 1;
    this.pageSize = ev.pageSize;
    this.load();
  }
}
