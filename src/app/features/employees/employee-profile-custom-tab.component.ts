import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import type { EmployeeProfileFull } from './employee-profile.types';

interface CustomFieldRow {
  field_def_id: number;
  field_key: string;
  label: string;
  field_type: string;
  section?: string | null;
  options: string[];
  is_required: boolean;
  value?: string | null;
}

@Component({
  selector: 'em-profile-custom-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    SearchableSelectComponent,
  ],
  template: `
    <form class="tab-form" (ngSubmit)="save()">
      @if (!fields.length) {
        <p class="empty">
          No hay campos personalizados configurados. Administre los campos en Configuración → Campos del expediente.
        </p>
      } @else {
        @for (section of sections; track section) {
          <h3 class="section-title">{{ section }}</h3>
          <div class="grid-2">
            @for (f of fieldsBySection(section); track f.field_key) {
              @if (f.field_type === 'boolean') {
                <mat-checkbox [formControl]="controlFor(f.field_key)">
                  {{ f.label }}@if (f.is_required) { * }
                </mat-checkbox>
              } @else if (f.field_type === 'textarea') {
                <mat-form-field appearance="outline" class="span-2">
                  <mat-label>{{ f.label }}</mat-label>
                  <textarea matInput rows="2" [formControl]="controlFor(f.field_key)"></textarea>
                </mat-form-field>
              } @else if (f.field_type === 'select') {
                <em-searchable-select
                  [label]="f.label + (f.is_required ? ' *' : '')"
                  [control]="asControl(controlFor(f.field_key))"
                  [options]="selectOptions(f)"
                  [allowNull]="!f.is_required"
                  nullLabel="—"
                />
              } @else {
                <mat-form-field appearance="outline">
                  <mat-label>{{ f.label }}</mat-label>
                  <input
                    matInput
                    [type]="f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'"
                    [formControl]="controlFor(f.field_key)"
                  />
                </mat-form-field>
              }
            }
          </div>
        }
      }
      @if (canEdit && fields.length) {
        <div class="actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            Guardar campos adicionales
          </button>
        </div>
      }
    </form>
  `,
  styles: `
    .tab-form { padding: 1.25rem 0.5rem 1.5rem; }
    .section-title { margin: 1rem 0 0.75rem; font-size: 0.95rem; font-weight: 700; }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 0.25rem 1rem;
    }
    .span-2 { grid-column: 1 / -1; }
    .empty { color: rgba(10, 10, 10, 0.55); font-size: 0.9rem; }
    .actions { margin-top: 1.25rem; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
  `,
})
export class EmployeeProfileCustomTabComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) employeeId!: number;
  @Input() canEdit = false;
  @Input({ required: true }) data!: EmployeeProfileFull;
  @Output() readonly updated = new EventEmitter<EmployeeProfileFull>();

  fields: CustomFieldRow[] = [];
  sections: string[] = [];
  form = this.fb.group({} as Record<string, ReturnType<typeof this.fb.control>>);
  saving = false;

  ngOnChanges(): void {
    if (!this.data) return;
    this.fields = (this.data.custom_fields ?? []) as CustomFieldRow[];
    const secSet = new Set(this.fields.map((f) => f.section?.trim() || 'General'));
    this.sections = [...secSet].sort();
    const group: Record<string, ReturnType<typeof this.fb.control>> = {};
    for (const f of this.fields) {
      let val = f.value ?? '';
      if (f.field_type === 'boolean') {
        val = val === 'true' || val === '1' || val === 'si' || val === 'sí' ? 'true' : 'false';
      }
      group[f.field_key] = this.fb.control(val);
    }
    this.form = this.fb.group(group);
    if (this.canEdit) this.form.enable();
    else this.form.disable();
  }

  fieldsBySection(section: string): CustomFieldRow[] {
    return this.fields.filter((f) => (f.section?.trim() || 'General') === section);
  }

  controlFor(key: string): FormControl {
    return this.form.controls[key] as FormControl;
  }

  asControl(c: FormControl): FormControl {
    return c;
  }

  selectOptions(f: CustomFieldRow) {
    return f.options.map((o) => ({ value: o, label: o }));
  }

  save(): void {
    if (!this.canEdit) return;
    this.saving = true;
    const raw = this.form.getRawValue() as Record<string, string>;
    const body = {
      custom_fields: this.fields.map((f) => {
        let v = raw[f.field_key] ?? '';
        if (f.field_type === 'boolean') {
          v = String(v) === 'true' ? 'true' : 'false';
        }
        return { field_key: f.field_key, value: String(v) };
      }),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`, body).subscribe({
      next: (p) => {
        this.updated.emit(p);
        this.snack.open('Campos adicionales guardados', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
