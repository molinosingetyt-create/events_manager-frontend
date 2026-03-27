import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, Paginated } from '../../core/services/api.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ENTITY_STATUS_OPTIONS, ROLE_OPTIONS } from '../../shared/searchable-select/select-options';

interface AreaRow {
  id: number;
  name: string;
}

@Component({
  selector: 'em-user-create-dialog',
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
      <h2 mat-dialog-title>Nuevo usuario</h2>
      <mat-dialog-content>
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
          <mat-label>Contraseña</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
        </mat-form-field>
        <em-searchable-select label="Rol" [control]="form.controls.role" [options]="roleOptions" />
        <em-searchable-select label="Área" [control]="form.controls.area_id" [options]="areaOptions" />
        <em-searchable-select label="Estado" [control]="form.controls.status" [options]="statusOptions" />
      </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || loading">
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Crear
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 100%;
      padding-top: 0.5rem;
      box-sizing: border-box;
    }
    .full {
      width: 100%;
    }
  `,
})
export class UserCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<UserCreateDialogComponent>);

  areaOptions: SearchableOption<number>[] = [];
  readonly roleOptions = ROLE_OPTIONS;
  readonly statusOptions = ENTITY_STATUS_OPTIONS;
  loading = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['ADMIN', Validators.required],
    area_id: [0, [Validators.required, Validators.min(1)]],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.api.get<Paginated<AreaRow>>('/areas', { page: 1, page_size: 200 }).subscribe((r) => {
      this.areaOptions = r.items.map((a) => ({ value: a.id, label: a.name }));
      if (r.items.length) {
        this.form.patchValue({ area_id: r.items[0].id });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const v = this.form.getRawValue();
    this.api.post('/users', v).subscribe({
      next: () => this.ref.close(true),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
