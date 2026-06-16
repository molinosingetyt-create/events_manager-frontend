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
import {
  LANGUAGE_LEVEL_OPTIONS,
  SOFTWARE_PROFICIENCY_OPTIONS,
  WORK_SST_CERT_OPTIONS,
} from './employee-profile-options';
import type { EmployeeProfileFull } from './employee-profile.types';

@Component({
  selector: 'em-profile-competencies-tab',
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
      <h3 class="section-title">Idiomas</h3>
      <div formArrayName="languages" class="career-list">
        @for (row of langRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Idioma</mat-label>
                <input matInput formControlName="language" required />
              </mat-form-field>
              <em-searchable-select
                label="Nivel"
                [control]="asControl(g.controls['level'])"
                [options]="languageLevelOptions"
                [allowNull]="true"
                nullLabel="—"
              />
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeLang($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addLang()">
          <mat-icon>translate</mat-icon> Agregar idioma
        </button>
      }

      <h3 class="section-title">Software y herramientas</h3>
      <div formArrayName="software_skills" class="career-list">
        @for (row of skillRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Herramienta</mat-label>
                <input matInput formControlName="name" required />
              </mat-form-field>
              <em-searchable-select
                label="Dominio"
                [control]="asControl(g.controls['proficiency'])"
                [options]="softwareProficiencyOptions"
                [allowNull]="true"
                nullLabel="—"
              />
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeSkill($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addSkill()">
          <mat-icon>computer</mat-icon> Agregar herramienta
        </button>
      }

      <h3 class="section-title">Licencias de conducción</h3>
      <div formArrayName="driving_licenses" class="career-list">
        @for (row of licenseRows.controls; track $index) {
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Categoría</mat-label>
                <input matInput formControlName="category" placeholder="Ej. B1" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Vencimiento</mat-label>
                <input matInput type="date" formControlName="expires_at" />
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeLicense($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addLicense()">
          <mat-icon>directions_car</mat-icon> Agregar licencia
        </button>
      }

      <h3 class="section-title">Certificaciones SST vigentes</h3>
      <div formArrayName="work_sst_certs" class="career-list">
        @for (row of certRows.controls; track $index) {
          @let g = asGroup(row);
          <div class="career-card" [formGroupName]="$index">
            <div class="grid-2">
              <em-searchable-select
                label="Tipo"
                [control]="asControl(g.controls['cert_type'])"
                [options]="workSstCertOptions"
              />
              <mat-form-field appearance="outline">
                <mat-label>Expedición</mat-label>
                <input matInput type="date" formControlName="issued_at" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Vencimiento</mat-label>
                <input matInput type="date" formControlName="expires_at" />
              </mat-form-field>
            </div>
            @if (canEdit) {
              <button mat-icon-button type="button" class="remove-career" (click)="removeCert($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addCert()">
          <mat-icon>health_and_safety</mat-icon> Agregar certificación SST
        </button>
      }

      <h3 class="section-title">Evaluaciones de desempeño (conductuales)</h3>
      <div formArrayName="competency_evaluations" class="career-list">
        @for (row of evalRows.controls; track $index) {
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
              <button mat-icon-button type="button" class="remove-career" (click)="removeEval($index)" aria-label="Quitar">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
      @if (canEdit) {
        <button mat-stroked-button type="button" (click)="addEval()">
          <mat-icon>assessment</mat-icon> Agregar evaluación
        </button>
        <div class="actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            Guardar competencias
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
export class EmployeeProfileCompetenciesTabComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) employeeId!: number;
  @Input() canEdit = false;
  @Input({ required: true }) data!: EmployeeProfileFull;
  @Output() readonly updated = new EventEmitter<EmployeeProfileFull>();

  readonly languageLevelOptions = LANGUAGE_LEVEL_OPTIONS;
  readonly softwareProficiencyOptions = SOFTWARE_PROFICIENCY_OPTIONS;
  readonly workSstCertOptions = WORK_SST_CERT_OPTIONS;
  saving = false;

  form = this.fb.group({
    languages: this.fb.array([] as FormGroup[]),
    software_skills: this.fb.array([] as FormGroup[]),
    driving_licenses: this.fb.array([] as FormGroup[]),
    work_sst_certs: this.fb.array([] as FormGroup[]),
    competency_evaluations: this.fb.array([] as FormGroup[]),
  });

  get langRows(): FormArray {
    return this.form.controls.languages;
  }
  get skillRows(): FormArray {
    return this.form.controls.software_skills;
  }
  get licenseRows(): FormArray {
    return this.form.controls.driving_licenses;
  }
  get certRows(): FormArray {
    return this.form.controls.work_sst_certs;
  }
  get evalRows(): FormArray {
    return this.form.controls.competency_evaluations;
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
    this.langRows.clear();
    for (const x of p.languages ?? []) {
      this.langRows.push(
        this.fb.group({
          language: [x.language, Validators.required],
          level: [x.level ?? null],
        }),
      );
    }
    this.skillRows.clear();
    for (const x of p.software_skills ?? []) {
      this.skillRows.push(
        this.fb.group({ name: [x.name, Validators.required], proficiency: [x.proficiency ?? null] }),
      );
    }
    this.licenseRows.clear();
    for (const x of p.driving_licenses ?? []) {
      this.licenseRows.push(
        this.fb.group({
          category: [x.category, Validators.required],
          expires_at: [this.isoDate(x.expires_at)],
        }),
      );
    }
    this.certRows.clear();
    for (const x of p.work_sst_certs ?? []) {
      this.certRows.push(
        this.fb.group({
          cert_type: [x.cert_type, Validators.required],
          issued_at: [this.isoDate(x.issued_at)],
          expires_at: [this.isoDate(x.expires_at)],
          certificate_url: [x.certificate_url ?? ''],
        }),
      );
    }
    this.evalRows.clear();
    for (const x of p.competency_evaluations ?? []) {
      this.evalRows.push(
        this.fb.group({
          period_label: [x.period_label, Validators.required],
          rating: [x.rating ?? ''],
          evaluator_name: [x.evaluator_name ?? ''],
          notes: [x.notes ?? ''],
        }),
      );
    }
  }

  addLang(): void {
    this.langRows.push(this.fb.group({ language: ['', Validators.required], level: [null as string | null] }));
  }
  removeLang(i: number): void {
    this.langRows.removeAt(i);
  }
  addSkill(): void {
    this.skillRows.push(this.fb.group({ name: ['', Validators.required], proficiency: [null as string | null] }));
  }
  removeSkill(i: number): void {
    this.skillRows.removeAt(i);
  }
  addLicense(): void {
    this.licenseRows.push(this.fb.group({ category: ['', Validators.required], expires_at: [''] }));
  }
  removeLicense(i: number): void {
    this.licenseRows.removeAt(i);
  }
  addCert(): void {
    this.certRows.push(
      this.fb.group({
        cert_type: ['altura', Validators.required],
        issued_at: [''],
        expires_at: [''],
        certificate_url: [''],
      }),
    );
  }
  removeCert(i: number): void {
    this.certRows.removeAt(i);
  }
  addEval(): void {
    this.evalRows.push(
      this.fb.group({
        period_label: ['', Validators.required],
        rating: [''],
        evaluator_name: [''],
        notes: [''],
      }),
    );
  }
  removeEval(i: number): void {
    this.evalRows.removeAt(i);
  }

  save(): void {
    if (!this.canEdit) return;
    this.saving = true;
    type Row = Record<string, string | null>;
    const v = this.form.getRawValue() as {
      languages: Row[];
      software_skills: Row[];
      driving_licenses: Row[];
      work_sst_certs: Row[];
      competency_evaluations: Row[];
    };
    const body = {
      languages: v.languages.map((r) => ({
        language: String(r['language'] ?? '').trim(),
        level: r['level'],
      })),
      software_skills: v.software_skills.map((r) => ({
        name: String(r['name'] ?? '').trim(),
        proficiency: r['proficiency'],
      })),
      driving_licenses: v.driving_licenses.map((r) => ({
        category: String(r['category'] ?? '').trim(),
        expires_at: this.emptyToNull(String(r['expires_at'] ?? '')) || null,
      })),
      work_sst_certs: v.work_sst_certs.map((r) => ({
        cert_type: r['cert_type'],
        issued_at: this.emptyToNull(String(r['issued_at'] ?? '')) || null,
        expires_at: this.emptyToNull(String(r['expires_at'] ?? '')) || null,
        certificate_url: this.emptyToNull(String(r['certificate_url'] ?? '')),
      })),
      competency_evaluations: v.competency_evaluations.map((r) => ({
        period_label: String(r['period_label'] ?? '').trim(),
        rating: this.emptyToNull(String(r['rating'] ?? '')),
        evaluator_name: this.emptyToNull(String(r['evaluator_name'] ?? '')),
        notes: this.emptyToNull(String(r['notes'] ?? '')),
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`, body).subscribe({
      next: (p) => {
        this.updated.emit(p);
        this.patch(p);
        this.snack.open('Competencias guardadas', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
