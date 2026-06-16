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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { INCAPACITY_ORIGIN_OPTIONS } from './employee-profile-options';
import type { EmployeeProfileFull } from './employee-profile.types';

@Component({
  selector: 'em-profile-sst-tab',
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
    <form [formGroup]="form" class="tab-form" (ngSubmit)="save()">
      <h3 class="section-title">Examen de ingreso</h3>
      <div class="grid-2" formGroupName="profile">
        <mat-form-field appearance="outline">
          <mat-label>Fecha examen</mat-label>
          <input matInput type="date" formControlName="entry_exam_date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Concepto médico</mat-label>
          <input matInput formControlName="entry_medical_concept" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Restricciones al ingreso</mat-label>
          <textarea matInput rows="2" formControlName="entry_restrictions"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Enfermedad laboral</mat-label>
          <textarea matInput rows="2" formControlName="occupational_disease"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Restricciones / recomendaciones vigentes</mat-label>
          <textarea matInput rows="2" formControlName="current_medical_restrictions"></textarea>
        </mat-form-field>
      </div>

      <h3 class="section-title">Exámenes periódicos</h3>
      <div formArrayName="periodic_exams" class="career-list">
        @for (row of periodicRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" formControlName="exam_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Resultado</mat-label>
                <input matInput formControlName="result" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Notas</mat-label>
                <textarea matInput rows="2" formControlName="notes"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removePeriodic($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addPeriodic()">
          <mat-icon>medical_services</mat-icon> Agregar examen
        </button>
      }

      <h3 class="section-title">Incapacidades</h3>
      <div formArrayName="incapacities" class="career-list">
        @for (row of incapRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <em-searchable-select
                label="Origen"
                [control]="asControl(g.controls['origin'])"
                [options]="incapacityOriginOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Diagnóstico</mat-label>
                <input matInput formControlName="diagnosis" />
              </mat-form-field>
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
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeIncap($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addIncap()">
          <mat-icon>sick</mat-icon> Agregar incapacidad
        </button>
      }

      <h3 class="section-title">Accidentes de trabajo</h3>
      <div formArrayName="accidents" class="career-list">
        @for (row of accidentRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput type="date" formControlName="occurred_at" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Días perdidos</mat-label>
                <input matInput type="number" min="0" formControlName="lost_days" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="2" formControlName="description"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeAccident($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addAccident()">
          <mat-icon>report</mat-icon> Agregar accidente
        </button>
      }

      <h3 class="section-title">EPP entregados</h3>
      <div formArrayName="ppe" class="career-list">
        @for (row of ppeRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Elemento</mat-label>
                <input matInput formControlName="item_name" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha entrega</mat-label>
                <input matInput type="date" formControlName="delivered_at" />
              </mat-form-field>
              <mat-checkbox formControlName="receipt_signed" class="span-2">
                Recibido firmado
              </mat-checkbox>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removePpe($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addPpe()">
          <mat-icon>construction</mat-icon> Agregar EPP
        </button>
        <div class="actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            Guardar SST
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
export class EmployeeProfileSstTabComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) employeeId!: number;
  @Input() canEdit = false;
  @Input({ required: true }) data!: EmployeeProfileFull;
  @Output() readonly updated = new EventEmitter<EmployeeProfileFull>();

  readonly incapacityOriginOptions = INCAPACITY_ORIGIN_OPTIONS;
  saving = false;

  form = this.fb.group({
    profile: this.fb.group({
      entry_exam_date: [''],
      entry_medical_concept: [''],
      entry_restrictions: [''],
      occupational_disease: [''],
      current_medical_restrictions: [''],
    }),
    periodic_exams: this.fb.array([] as FormGroup[]),
    incapacities: this.fb.array([] as FormGroup[]),
    accidents: this.fb.array([] as FormGroup[]),
    ppe: this.fb.array([] as FormGroup[]),
  });

  get periodicRows(): FormArray {
    return this.form.controls.periodic_exams;
  }
  get incapRows(): FormArray {
    return this.form.controls.incapacities;
  }
  get accidentRows(): FormArray {
    return this.form.controls.accidents;
  }
  get ppeRows(): FormArray {
    return this.form.controls.ppe;
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
    const sp = p.sst_profile ?? {};
    this.form.controls.profile.patchValue({
      entry_exam_date: this.isoDate(sp.entry_exam_date),
      entry_medical_concept: sp.entry_medical_concept ?? '',
      entry_restrictions: sp.entry_restrictions ?? '',
      occupational_disease: sp.occupational_disease ?? '',
      current_medical_restrictions: sp.current_medical_restrictions ?? '',
    });
    this.periodicRows.clear();
    for (const x of p.sst_periodic_exams ?? []) {
      this.periodicRows.push(
        this.fb.group({
          exam_date: [this.isoDate(x.exam_date)],
          result: [x.result ?? ''],
          notes: [x.notes ?? ''],
        }),
      );
    }
    this.incapRows.clear();
    for (const x of p.sst_incapacities ?? []) {
      this.incapRows.push(
        this.fb.group({
          origin: [x.origin ?? null],
          diagnosis: [x.diagnosis ?? ''],
          days: [x.days ?? null],
          start_date: [this.isoDate(x.start_date)],
          end_date: [this.isoDate(x.end_date)],
        }),
      );
    }
    this.accidentRows.clear();
    for (const x of p.sst_accidents ?? []) {
      this.accidentRows.push(
        this.fb.group({
          occurred_at: [this.isoDate(x.occurred_at)],
          description: [x.description ?? ''],
          lost_days: [x.lost_days ?? null],
        }),
      );
    }
    this.ppeRows.clear();
    for (const x of p.sst_ppe ?? []) {
      this.ppeRows.push(
        this.fb.group({
          item_name: [x.item_name, Validators.required],
          delivered_at: [this.isoDate(x.delivered_at)],
          receipt_signed: [x.receipt_signed],
        }),
      );
    }
  }

  addPeriodic(): void {
    this.periodicRows.push(this.fb.group({ exam_date: [''], result: [''], notes: [''] }));
  }
  removePeriodic(i: number): void {
    this.periodicRows.removeAt(i);
  }
  addIncap(): void {
    this.incapRows.push(
      this.fb.group({
        origin: [null as string | null],
        diagnosis: [''],
        days: [null as number | null],
        start_date: [''],
        end_date: [''],
      }),
    );
  }
  removeIncap(i: number): void {
    this.incapRows.removeAt(i);
  }
  addAccident(): void {
    this.accidentRows.push(
      this.fb.group({ occurred_at: [''], description: [''], lost_days: [null as number | null] }),
    );
  }
  removeAccident(i: number): void {
    this.accidentRows.removeAt(i);
  }
  addPpe(): void {
    this.ppeRows.push(
      this.fb.group({ item_name: ['', Validators.required], delivered_at: [''], receipt_signed: [false] }),
    );
  }
  removePpe(i: number): void {
    this.ppeRows.removeAt(i);
  }

  save(): void {
    if (!this.canEdit) return;
    this.saving = true;
    type Row = Record<string, string | number | boolean | null>;
    const v = this.form.getRawValue() as {
      profile: Row;
      periodic_exams: Row[];
      incapacities: Row[];
      accidents: Row[];
      ppe: Row[];
    };
    const pr = v.profile;
    const body = {
      sst_profile: {
        entry_exam_date: this.emptyToNull(String(pr['entry_exam_date'] ?? '')) || null,
        entry_medical_concept: this.emptyToNull(String(pr['entry_medical_concept'] ?? '')),
        entry_restrictions: this.emptyToNull(String(pr['entry_restrictions'] ?? '')),
        occupational_disease: this.emptyToNull(String(pr['occupational_disease'] ?? '')),
        current_medical_restrictions: this.emptyToNull(String(pr['current_medical_restrictions'] ?? '')),
      },
      sst_periodic_exams: v.periodic_exams.map((r) => ({
        exam_date: this.emptyToNull(String(r['exam_date'] ?? '')) || null,
        result: this.emptyToNull(String(r['result'] ?? '')),
        notes: this.emptyToNull(String(r['notes'] ?? '')),
      })),
      sst_incapacities: v.incapacities.map((r) => ({
        origin: (r['origin'] as string | null) ?? null,
        diagnosis: this.emptyToNull(String(r['diagnosis'] ?? '')),
        days: r['days'] as number | null,
        start_date: this.emptyToNull(String(r['start_date'] ?? '')) || null,
        end_date: this.emptyToNull(String(r['end_date'] ?? '')) || null,
      })),
      sst_accidents: v.accidents.map((r) => ({
        occurred_at: this.emptyToNull(String(r['occurred_at'] ?? '')) || null,
        description: this.emptyToNull(String(r['description'] ?? '')),
        lost_days: r['lost_days'] as number | null,
      })),
      sst_ppe: v.ppe.map((r) => ({
        item_name: String(r['item_name'] ?? '').trim(),
        delivered_at: this.emptyToNull(String(r['delivered_at'] ?? '')) || null,
        receipt_signed: !!r['receipt_signed'],
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`, body).subscribe({
      next: (p) => {
        this.updated.emit(p);
        this.patch(p);
        this.snack.open('Información SST guardada', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
