import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import {
  ABSENCE_TYPE_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  DISCIPLINARY_ACTION_OPTIONS,
} from './employee-profile-options';
import type { EmployeeProfileFull } from './employee-profile.types';

@Component({
  selector: 'em-profile-history-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    SearchableSelectComponent,
  ],
  template: `
    <form [formGroup]="form" class="tab-form" (ngSubmit)="save()">
      <h3 class="section-title">Historial de contratos</h3>
      <div formArrayName="contract_history" class="career-list">
        @for (row of contractRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Fecha efectiva</mat-label>
                <input matInput type="date" formControlName="effective_date" />
              </mat-form-field>
              <em-searchable-select
                label="Tipo de contrato"
                [control]="asControl(g.controls['contract_type'])"
                [options]="contractTypeOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Vencimiento</mat-label>
                <input matInput type="date" formControlName="end_date" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Notas</mat-label>
                <textarea matInput rows="2" formControlName="notes"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeContract($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addContract()">
          <mat-icon>description</mat-icon> Agregar contrato
        </button>
      }

      <h3 class="section-title">Historial salarial</h3>
      <div formArrayName="salary_history" class="career-list">
        @for (row of salaryRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Fecha cambio</mat-label>
                <input matInput type="date" formControlName="effective_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Salario anterior</mat-label>
                <input matInput type="number" min="0" formControlName="previous_salary" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nuevo salario</mat-label>
                <input matInput type="number" min="0" formControlName="new_salary" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Motivo</mat-label>
                <input matInput formControlName="reason" />
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeSalary($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addSalary()">
          <mat-icon>payments</mat-icon> Agregar cambio salarial
        </button>
      }

      <h3 class="section-title">Evaluaciones de desempeño</h3>
      <div formArrayName="performance_reviews" class="career-list">
        @for (row of reviewRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Período</mat-label>
                <input matInput formControlName="period_label" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Calificación</mat-label>
                <input matInput formControlName="rating" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Evaluador</mat-label>
                <input matInput formControlName="evaluator_name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Notas</mat-label>
                <textarea matInput rows="2" formControlName="notes"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeReview($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addReview()">
          <mat-icon>star</mat-icon> Agregar evaluación
        </button>
      }

      <h3 class="section-title">Reconocimientos</h3>
      <div formArrayName="recognitions" class="career-list">
        @for (row of recognitionRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Título</mat-label>
                <input matInput formControlName="title" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" formControlName="recognized_at" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="2" formControlName="description"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeRecognition($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addRecognition()">
          <mat-icon>emoji_events</mat-icon> Agregar reconocimiento
        </button>
      }

      <h3 class="section-title">Medidas disciplinarias</h3>
      <div formArrayName="disciplinary_actions" class="career-list">
        @for (row of disciplinaryRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <em-searchable-select
                label="Tipo"
                [control]="asControl(g.controls['action_type'])"
                [options]="disciplinaryActionOptions"
              />
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" formControlName="occurred_at" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="2" formControlName="description"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeDisciplinary($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addDisciplinary()">
          <mat-icon>gavel</mat-icon> Agregar medida
        </button>
      }

      <h3 class="section-title">Vacaciones y ausencias</h3>
      <div formArrayName="absence_records" class="career-list">
        @for (row of absenceRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <em-searchable-select
                label="Tipo"
                [control]="asControl(g.controls['absence_type'])"
                [options]="absenceTypeOptions"
              />
              <mat-form-field appearance="outline">
                <mat-label>Días</mat-label>
                <input matInput type="number" min="0" formControlName="days" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Inicio</mat-label>
                <input matInput type="date" formControlName="start_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fin</mat-label>
                <input matInput type="date" formControlName="end_date" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Notas</mat-label>
                <textarea matInput rows="2" formControlName="notes"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeAbsence($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addAbsence()">
          <mat-icon>event_busy</mat-icon> Agregar ausencia
        </button>
        <div class="actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            Guardar historial interno
          </button>
        </div>
      }
    </form>
  `,
  styles: `
    .tab-form { padding: 1.25rem 0.5rem 1.5rem; }
    .section-title { margin: 1.25rem 0 0.75rem; font-size: 0.95rem; font-weight: 700; }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 0.25rem 1rem;
    }
    .span-2 { grid-column: 1 / -1; }
    .career-list { display: flex; flex-direction: column; gap: 1rem; }
    .career-card {
      position: relative;
      padding: 1rem 2.5rem 0.5rem 1rem;
      border: 1px solid rgba(10, 10, 10, 0.1);
      border-radius: 8px;
    }
    .remove-career { position: absolute; top: 0.25rem; right: 0.25rem; }
    .actions { margin-top: 1.25rem; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
  `,
})
export class EmployeeProfileHistoryTabComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) employeeId!: number;
  @Input() canEdit = false;
  @Input({ required: true }) data!: EmployeeProfileFull;
  @Output() readonly updated = new EventEmitter<EmployeeProfileFull>();

  readonly contractTypeOptions = CONTRACT_TYPE_OPTIONS;
  readonly disciplinaryActionOptions = DISCIPLINARY_ACTION_OPTIONS;
  readonly absenceTypeOptions = ABSENCE_TYPE_OPTIONS;
  saving = false;

  form = this.fb.group({
    contract_history: this.fb.array([] as FormGroup[]),
    salary_history: this.fb.array([] as FormGroup[]),
    performance_reviews: this.fb.array([] as FormGroup[]),
    recognitions: this.fb.array([] as FormGroup[]),
    disciplinary_actions: this.fb.array([] as FormGroup[]),
    absence_records: this.fb.array([] as FormGroup[]),
  });

  get contractRows(): FormArray {
    return this.form.controls.contract_history;
  }
  get salaryRows(): FormArray {
    return this.form.controls.salary_history;
  }
  get reviewRows(): FormArray {
    return this.form.controls.performance_reviews;
  }
  get recognitionRows(): FormArray {
    return this.form.controls.recognitions;
  }
  get disciplinaryRows(): FormArray {
    return this.form.controls.disciplinary_actions;
  }
  get absenceRows(): FormArray {
    return this.form.controls.absence_records;
  }

  ngOnChanges(): void {
    if (!this.data) return;
    this.patch(this.data);
    if (this.canEdit) this.form.enable();
    else this.form.disable();
  }

  asGroup(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }
  asControl(c: AbstractControl): FormControl {
    return c as FormControl;
  }

  private isoDate(v?: string | null): string {
    return v ? String(v).slice(0, 10) : '';
  }
  private emptyToNull(v: string | null | undefined): string | null {
    const s = (v ?? '').trim();
    return s || null;
  }

  private patch(p: EmployeeProfileFull): void {
    this.contractRows.clear();
    for (const x of p.contract_history ?? []) {
      this.contractRows.push(
        this.fb.group({
          effective_date: [this.isoDate(x.effective_date)],
          contract_type: [x.contract_type ?? null],
          end_date: [this.isoDate(x.end_date)],
          notes: [x.notes ?? ''],
        }),
      );
    }
    this.salaryRows.clear();
    for (const x of p.salary_history ?? []) {
      this.salaryRows.push(
        this.fb.group({
          effective_date: [this.isoDate(x.effective_date)],
          previous_salary: [x.previous_salary ?? null],
          new_salary: [x.new_salary ?? null],
          reason: [x.reason ?? ''],
        }),
      );
    }
    this.reviewRows.clear();
    for (const x of p.performance_reviews ?? []) {
      this.reviewRows.push(
        this.fb.group({
          period_label: [x.period_label, Validators.required],
          rating: [x.rating ?? ''],
          evaluator_name: [x.evaluator_name ?? ''],
          notes: [x.notes ?? ''],
        }),
      );
    }
    this.recognitionRows.clear();
    for (const x of p.recognitions ?? []) {
      this.recognitionRows.push(
        this.fb.group({
          title: [x.title, Validators.required],
          recognized_at: [this.isoDate(x.recognized_at)],
          description: [x.description ?? ''],
        }),
      );
    }
    this.disciplinaryRows.clear();
    for (const x of p.disciplinary_actions ?? []) {
      this.disciplinaryRows.push(
        this.fb.group({
          action_type: [x.action_type, Validators.required],
          occurred_at: [this.isoDate(x.occurred_at)],
          description: [x.description ?? ''],
        }),
      );
    }
    this.absenceRows.clear();
    for (const x of p.absence_records ?? []) {
      this.absenceRows.push(
        this.fb.group({
          absence_type: [x.absence_type, Validators.required],
          start_date: [this.isoDate(x.start_date)],
          end_date: [this.isoDate(x.end_date)],
          days: [x.days ?? null],
          notes: [x.notes ?? ''],
        }),
      );
    }
  }

  addContract(): void {
    this.contractRows.push(
      this.fb.group({
        effective_date: [''],
        contract_type: [null as string | null],
        end_date: [''],
        notes: [''],
      }),
    );
  }
  removeContract(i: number): void {
    this.contractRows.removeAt(i);
  }
  addSalary(): void {
    this.salaryRows.push(
      this.fb.group({
        effective_date: [''],
        previous_salary: [null as number | null],
        new_salary: [null as number | null],
        reason: [''],
      }),
    );
  }
  removeSalary(i: number): void {
    this.salaryRows.removeAt(i);
  }
  addReview(): void {
    this.reviewRows.push(
      this.fb.group({
        period_label: ['', Validators.required],
        rating: [''],
        evaluator_name: [''],
        notes: [''],
      }),
    );
  }
  removeReview(i: number): void {
    this.reviewRows.removeAt(i);
  }
  addRecognition(): void {
    this.recognitionRows.push(
      this.fb.group({ title: ['', Validators.required], recognized_at: [''], description: [''] }),
    );
  }
  removeRecognition(i: number): void {
    this.recognitionRows.removeAt(i);
  }
  addDisciplinary(): void {
    this.disciplinaryRows.push(
      this.fb.group({
        action_type: ['llamado_atencion', Validators.required],
        occurred_at: [''],
        description: [''],
      }),
    );
  }
  removeDisciplinary(i: number): void {
    this.disciplinaryRows.removeAt(i);
  }
  addAbsence(): void {
    this.absenceRows.push(
      this.fb.group({
        absence_type: ['vacaciones', Validators.required],
        start_date: [''],
        end_date: [''],
        days: [null as number | null],
        notes: [''],
      }),
    );
  }
  removeAbsence(i: number): void {
    this.absenceRows.removeAt(i);
  }

  save(): void {
    if (!this.canEdit) return;
    this.saving = true;
    type Row = Record<string, string | number | null>;
    const v = this.form.getRawValue() as {
      contract_history: Row[];
      salary_history: Row[];
      performance_reviews: Row[];
      recognitions: Row[];
      disciplinary_actions: Row[];
      absence_records: Row[];
    };
    const body = {
      contract_history: v.contract_history.map((r) => ({
        effective_date: this.emptyToNull(String(r['effective_date'] ?? '')) || null,
        contract_type: r['contract_type'] as string | null,
        end_date: this.emptyToNull(String(r['end_date'] ?? '')) || null,
        notes: this.emptyToNull(String(r['notes'] ?? '')),
      })),
      salary_history: v.salary_history.map((r) => ({
        effective_date: this.emptyToNull(String(r['effective_date'] ?? '')) || null,
        previous_salary: r['previous_salary'] as number | null,
        new_salary: r['new_salary'] as number | null,
        reason: this.emptyToNull(String(r['reason'] ?? '')),
      })),
      performance_reviews: v.performance_reviews.map((r) => ({
        period_label: String(r['period_label'] ?? '').trim(),
        rating: this.emptyToNull(String(r['rating'] ?? '')),
        evaluator_name: this.emptyToNull(String(r['evaluator_name'] ?? '')),
        notes: this.emptyToNull(String(r['notes'] ?? '')),
      })),
      recognitions: v.recognitions.map((r) => ({
        title: String(r['title'] ?? '').trim(),
        recognized_at: this.emptyToNull(String(r['recognized_at'] ?? '')) || null,
        description: this.emptyToNull(String(r['description'] ?? '')),
      })),
      disciplinary_actions: v.disciplinary_actions.map((r) => ({
        action_type: r['action_type'],
        occurred_at: this.emptyToNull(String(r['occurred_at'] ?? '')) || null,
        description: this.emptyToNull(String(r['description'] ?? '')),
      })),
      absence_records: v.absence_records.map((r) => ({
        absence_type: r['absence_type'],
        start_date: this.emptyToNull(String(r['start_date'] ?? '')) || null,
        end_date: this.emptyToNull(String(r['end_date'] ?? '')) || null,
        days: r['days'] as number | null,
        notes: this.emptyToNull(String(r['notes'] ?? '')),
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`, body).subscribe({
      next: (p) => {
        this.updated.emit(p);
        this.patch(p);
        this.snack.open('Historial interno guardado', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
