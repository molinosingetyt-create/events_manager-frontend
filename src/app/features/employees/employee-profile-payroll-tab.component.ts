import { CurrencyPipe } from '@angular/common';
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
import type { EmployeeProfileFull } from './employee-profile.types';

const PAYROLL_CONCEPT_OPTIONS = [
  { value: 'salary', label: 'Salario / novedad salarial' },
  { value: 'bonus', label: 'Bonificación' },
  { value: 'deduction', label: 'Deducción' },
  { value: 'transport', label: 'Auxilio transporte' },
  { value: 'overtime_pay', label: 'Horas extra pagadas' },
  { value: 'social_security', label: 'Seguridad social' },
  { value: 'other', label: 'Otro' },
];

@Component({
  selector: 'em-profile-payroll-tab',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="tab-form">
      <h3 class="section-title">Datos de nómina (desde información laboral)</h3>
      <p class="hint">Estos valores se leen del expediente laboral. Edítelos en la pestaña Información laboral.</p>
      @if (summary) {
        <div class="summary-grid">
          <span><strong>Salario base:</strong> {{ summary.base_salary | currency: 'COP':'symbol-narrow':'1.0-0' }}</span>
          <span><strong>EPS:</strong> {{ summary.eps_name || '—' }} ({{ summary.eps_affiliation_number || '—' }})</span>
          <span><strong>Pensión:</strong> {{ summary.pension_fund || '—' }}</span>
          <span><strong>Cesantías:</strong> {{ summary.severance_fund || '—' }}</span>
          <span><strong>Caja compensación:</strong> {{ summary.family_compensation_box || '—' }}</span>
          <span><strong>ARL:</strong> {{ summary.arl_name || '—' }}</span>
          <span><strong>Banco:</strong> {{ summary.bank_name || '—' }} · {{ summary.bank_account_type || '' }} {{ summary.bank_account_number || '' }}</span>
        </div>
      }

      <h3 class="section-title">Novedades por período</h3>
      <form [formGroup]="entriesForm" (ngSubmit)="save()">
        <div formArrayName="rows" class="career-list">
          @for (row of entryRows.controls; track $index) {
            @let g = asGroup(row);
            <div class="career-card" [formGroupName]="$index">
              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Período (mes)</mat-label>
                  <input matInput type="month" formControlName="period_month" />
                </mat-form-field>
                <em-searchable-select
                  label="Tipo"
                  [control]="asControl(g.controls['concept_type'])"
                  [options]="conceptOptions"
                />
                <mat-form-field appearance="outline" class="span-2">
                  <mat-label>Descripción</mat-label>
                  <input matInput formControlName="description" required />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Valor</mat-label>
                  <input matInput type="number" formControlName="amount" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Código referencia</mat-label>
                  <input matInput formControlName="reference_code" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="span-2">
                  <mat-label>Notas</mat-label>
                  <textarea matInput rows="2" formControlName="notes"></textarea>
                </mat-form-field>
              </div>
              @if (canEditPayroll) {
                <button mat-icon-button type="button" class="remove-career" (click)="removeEntry($index)" aria-label="Quitar">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </div>
          }
        </div>
        @if (canEditPayroll) {
          <button mat-stroked-button type="button" (click)="addEntry()">
            <mat-icon>add</mat-icon> Agregar novedad
          </button>
          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving">
              Guardar novedades de nómina
            </button>
          </div>
        } @else if (!entryRows.length) {
          <p class="empty">Sin novedades registradas.</p>
        }
      </form>
    </div>
  `,
  styles: `
    .tab-form { padding: 1.25rem 0.5rem 1.5rem; }
    .section-title { margin: 1.25rem 0 0.75rem; font-size: 0.95rem; font-weight: 700; }
    .hint { font-size: 0.82rem; color: rgba(10, 10, 10, 0.55); margin: 0 0 0.75rem; }
    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      font-size: 0.88rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: rgba(0, 102, 204, 0.06);
      border-radius: 8px;
    }
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
    .empty { color: rgba(10, 10, 10, 0.55); }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
  `,
})
export class EmployeeProfilePayrollTabComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) employeeId!: number;
  @Input() canEditPayroll = false;
  @Input({ required: true }) data!: EmployeeProfileFull;
  @Output() readonly updated = new EventEmitter<EmployeeProfileFull>();

  readonly conceptOptions = PAYROLL_CONCEPT_OPTIONS;
  summary: EmployeeProfileFull['payroll_summary'] = null;
  entriesForm = this.fb.group({ rows: this.fb.array([] as FormGroup[]) });
  saving = false;

  get entryRows(): FormArray {
    return this.entriesForm.controls.rows;
  }

  ngOnChanges(): void {
    if (!this.data) return;
    this.summary = this.data.payroll_summary ?? null;
    this.entryRows.clear();
    for (const e of this.data.payroll_entries ?? []) {
      const pm = e.period_month ? String(e.period_month).slice(0, 7) : '';
      this.entryRows.push(
        this.fb.group({
          period_month: [pm, Validators.required],
          concept_type: [e.concept_type, Validators.required],
          description: [e.description, Validators.required],
          amount: [e.amount ?? null],
          reference_code: [e.reference_code ?? ''],
          notes: [e.notes ?? ''],
          source: ['manual'],
        }),
      );
    }
    if (this.canEditPayroll) this.entriesForm.enable();
    else this.entriesForm.disable();
  }

  asGroup(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }
  asControl(c: AbstractControl): FormControl {
    return c as FormControl;
  }

  addEntry(): void {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.entryRows.push(
      this.fb.group({
        period_month: [month, Validators.required],
        concept_type: ['other', Validators.required],
        description: ['', Validators.required],
        amount: [null as number | null],
        reference_code: [''],
        notes: [''],
        source: ['manual'],
      }),
    );
  }

  removeEntry(i: number): void {
    this.entryRows.removeAt(i);
  }

  save(): void {
    if (!this.canEditPayroll) return;
    this.saving = true;
    type Row = Record<string, string | number | null>;
    const rows = this.entryRows.getRawValue() as Row[];
    const body = {
      payroll_entries: rows.map((r) => {
        const pm = String(r['period_month'] ?? '');
        const period_month = pm.length === 7 ? `${pm}-01` : pm;
        return {
          period_month,
          concept_type: r['concept_type'],
          description: String(r['description'] ?? '').trim(),
          amount: r['amount'] as number | null,
          reference_code: (r['reference_code'] as string) || null,
          notes: (r['notes'] as string) || null,
          source: 'manual',
        };
      }),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`, body).subscribe({
      next: (p) => {
        this.updated.emit(p);
        this.snack.open('Novedades de nómina guardadas', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
