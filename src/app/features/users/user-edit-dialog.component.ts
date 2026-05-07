import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, Paginated } from '../../core/services/api.service';
import type { User } from '../../core/models/user';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS } from '../../shared/searchable-select/select-options';

interface ProfileRow {
  id: number;
  code: string;
  name: string;
}

interface AreaRow {
  id: number;
  name: string;
}

@Component({
  selector: 'em-user-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Editar usuario</h2>
      <mat-dialog-content>
      @if (loadError) {
        <p>No se pudo cargar el usuario.</p>
      } @else if (!loaded) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else {
        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nueva contraseña (opcional)</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password" />
          </mat-form-field>
          <em-searchable-select label="Rol" [control]="form.controls.role" [options]="roleOptions" />
          <em-searchable-select label="Área" [control]="form.controls.area_id" [options]="areaOptions" />
          <em-searchable-select label="Estado" [control]="form.controls.status" [options]="statusOptions" />
        </form>
      }
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="!loaded || loadError || form.invalid || loading"
        >
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Guardar
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      min-width: min(100%, 400px);
      padding-top: 0.5rem;
    }
    .full {
      width: 100%;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  `,
})
export class UserEditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<UserEditDialogComponent>);
  private readonly userId = inject(MAT_DIALOG_DATA) as number;

  areaOptions: SearchableOption<number>[] = [];
  roleOptions: SearchableOption<string>[] = [];
  readonly statusOptions = ENTITY_STATUS_OPTIONS;
  loaded = false;
  loadError = false;
  loading = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['ADMIN', Validators.required],
    area_id: [0, [Validators.required, Validators.min(1)]],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.api.get<ProfileRow[]>('/security/profiles').subscribe({
      next: (profiles) => {
        this.roleOptions = profiles.map((p) => ({
          value: p.code,
          label: `${p.name} (${p.code})`,
        }));
      },
    });
    this.api.get<Paginated<AreaRow>>('/areas', { page: 1, page_size: 200 }).subscribe((r) => {
      this.areaOptions = r.items.map((a) => ({ value: a.id, label: a.name }));
    });
    this.api.get<User>(`/users/${this.userId}`).subscribe({
      next: (u) => {
        this.form.patchValue({
          name: u.name,
          email: u.email,
          role: u.role,
          area_id: u.area_id,
          status: u.status,
        });
        this.loaded = true;
      },
      error: () => {
        this.loadError = true;
        this.loaded = true;
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: v.name,
      email: v.email,
      role: v.role,
      area_id: v.area_id,
      status: v.status,
    };
    const pwd = v.password.trim();
    if (pwd.length >= 8) {
      body['password'] = pwd;
    }
    this.api.patch(`/users/${this.userId}`, body).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
