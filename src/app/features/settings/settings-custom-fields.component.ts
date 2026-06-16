import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';

interface FieldDef {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  section?: string | null;
  options: string[];
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

const TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
  { value: 'select', label: 'Lista' },
  { value: 'textarea', label: 'Texto largo' },
];

@Component({
  selector: 'em-settings-custom-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="page-head">
      <h1>Campos del expediente</h1>
      <p class="page-lead">
        Defina campos adicionales para el expediente HR sin cambios de código. Aparecen en la pestaña «Campos adicionales».
      </p>
    </div>

    <form class="create-form" [formGroup]="form" (ngSubmit)="create()">
      <h2>Nuevo campo</h2>
      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Clave técnica</mat-label>
          <input matInput formControlName="field_key" placeholder="ej. numero_emergencia" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Etiqueta visible</mat-label>
          <input matInput formControlName="label" />
        </mat-form-field>
        <em-searchable-select
          label="Tipo"
          [control]="form.controls.field_type"
          [options]="typeOptions"
        />
        <mat-form-field appearance="outline">
          <mat-label>Sección</mat-label>
          <input matInput formControlName="section" placeholder="General" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Opciones (lista, separadas por coma)</mat-label>
          <input matInput formControlName="options_text" />
        </mat-form-field>
        <mat-checkbox formControlName="is_required">Obligatorio</mat-checkbox>
        <mat-form-field appearance="outline">
          <mat-label>Orden</mat-label>
          <input matInput type="number" formControlName="sort_order" />
        </mat-form-field>
      </div>
      <button mat-flat-button color="primary" type="submit" [disabled]="saving">
        Crear campo
      </button>
    </form>

    <h2 class="list-title">Campos definidos</h2>
    <table mat-table [dataSource]="defs" class="defs-table">
      <ng-container matColumnDef="label">
        <th mat-header-cell *matHeaderCellDef>Campo</th>
        <td mat-cell *matCellDef="let d">
          <strong>{{ d.label }}</strong>
          <span class="key">{{ d.field_key }}</span>
        </td>
      </ng-container>
      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Tipo</th>
        <td mat-cell *matCellDef="let d">{{ d.field_type }}</td>
      </ng-container>
      <ng-container matColumnDef="section">
        <th mat-header-cell *matHeaderCellDef>Sección</th>
        <td mat-cell *matCellDef="let d">{{ d.section || 'General' }}</td>
      </ng-container>
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>Activo</th>
        <td mat-cell *matCellDef="let d">{{ d.is_active ? 'Sí' : 'No' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let d">
          <button mat-icon-button type="button" (click)="toggleActive(d)" [matTooltip]="d.is_active ? 'Desactivar' : 'Activar'">
            <mat-icon>{{ d.is_active ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <button mat-icon-button type="button" color="warn" (click)="remove(d)" aria-label="Eliminar">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  `,
  styles: `
    .page-lead { color: rgba(10, 10, 10, 0.6); margin-top: 0.25rem; }
    .create-form {
      margin: 1.5rem 0;
      padding: 1rem;
      border: 1px solid rgba(10, 10, 10, 0.1);
      border-radius: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(200px, 1fr));
      gap: 0.5rem 1rem;
      margin-bottom: 1rem;
    }
    .span-2 { grid-column: 1 / -1; }
    .list-title { margin: 1.5rem 0 0.75rem; font-size: 1rem; }
    .defs-table { width: 100%; }
    .key { display: block; font-size: 0.72rem; color: rgba(10, 10, 10, 0.45); }
  `,
})
export class SettingsCustomFieldsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly typeOptions = TYPE_OPTIONS;
  readonly columns = ['label', 'type', 'section', 'active', 'actions'];
  defs: FieldDef[] = [];
  saving = false;

  form = this.fb.group({
    field_key: ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]*$/)]],
    label: ['', Validators.required],
    field_type: ['text', Validators.required],
    section: ['General'],
    options_text: [''],
    is_required: [false],
    sort_order: [0],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.get<FieldDef[]>('/employees/custom-field-definitions', { include_inactive: true }).subscribe({
      next: (d) => (this.defs = d),
      error: () => this.snack.open('No se pudieron cargar los campos', 'Cerrar', { duration: 4000 }),
    });
  }

  create(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const options = (v.options_text ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.api
      .post<FieldDef>('/employees/custom-field-definitions', {
        field_key: v.field_key,
        label: v.label,
        field_type: v.field_type,
        section: v.section || null,
        options,
        is_required: v.is_required,
        sort_order: v.sort_order ?? 0,
      })
      .subscribe({
        next: () => {
          this.form.reset({
            field_key: '',
            label: '',
            field_type: 'text',
            section: 'General',
            options_text: '',
            is_required: false,
            sort_order: 0,
          });
          this.load();
          this.snack.open('Campo creado', 'Cerrar', { duration: 3000 });
          this.saving = false;
        },
        error: () => {
          this.snack.open('No se pudo crear el campo', 'Cerrar', { duration: 4000 });
          this.saving = false;
        },
      });
  }

  toggleActive(d: FieldDef): void {
    this.api
      .patch<FieldDef>(`/employees/custom-field-definitions/${d.id}`, { is_active: !d.is_active })
      .subscribe({
        next: () => this.load(),
        error: () => this.snack.open('No se pudo actualizar', 'Cerrar', { duration: 4000 }),
      });
  }

  remove(d: FieldDef): void {
    if (!confirm(`¿Eliminar el campo «${d.label}»? Se perderán los valores guardados.`)) return;
    this.api.delete(`/employees/custom-field-definitions/${d.id}`).subscribe({
      next: () => {
        this.load();
        this.snack.open('Campo eliminado', 'Cerrar', { duration: 3000 });
      },
      error: () => this.snack.open('No se pudo eliminar', 'Cerrar', { duration: 4000 }),
    });
  }
}
