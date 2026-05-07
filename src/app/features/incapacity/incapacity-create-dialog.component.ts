import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { dateToYmd } from '../../core/utils/date-api';
import { DateFieldComponent } from '../../shared/date-field/date-field.component';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import { INCAPACITY_TYPE_OPTIONS } from '../../shared/searchable-select/select-options';

interface EmployeeOpt {
  id: number;
  name: string;
  identification_number: string;
}

interface EmployeeDetail {
  id: number;
  name: string;
  identification_number: string;
  temporal_category_id: number | null;
  temporal_category_name: string;
}

interface IncapacityNoteRead {
  id: number;
}

interface FormOptions {
  temporal_categories: { id: number; name: string; status: string }[];
  eps_arl: { id: number; kind: string; name: string; code: string | null; status: string }[];
  diagnoses: { id: number; code: string; name: string; description: string | null; status: string }[];
}

@Component({
  selector: 'em-incapacity-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    SearchableSelectComponent,
    DateFieldComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Nueva incapacidad</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <em-searchable-select
            label="Empleado"
            [control]="form.controls.employee_id"
            [options]="employeeOptions"
          />
          @if (!catalogsReady()) {
            <p class="pick-hint">Seleccione un empleado para cargar el formulario y el temporal por defecto.</p>
          }
          @if (catalogsReady()) {
            <em-searchable-select label="Tipo" [control]="form.controls.type" [options]="typeOptions" />
            <em-searchable-select
              label="Temporal"
              [control]="form.controls.temporal_category_id"
              [options]="temporalOptions"
            />
            <em-searchable-select
              label="EPS / ARL (opcional)"
              [control]="form.controls.eps_arl_id"
              [options]="epsOptions"
              [allowNull]="true"
              nullLabel="Sin EPS/ARL"
            />
            <em-searchable-select
              label="Diagnóstico (opcional)"
              [control]="form.controls.diagnosis_id"
              [options]="dxOptions"
              [allowNull]="true"
              nullLabel="Sin diagnóstico"
            />
            <mat-form-field appearance="outline" class="full">
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
            </mat-form-field>
            <em-date-field label="Fecha inicio" [control]="form.controls.start_date" />
            <em-date-field label="Fecha fin" [control]="form.controls.end_date" />
            <p class="date-hint">
              Para ausencias de más de un día indique <strong>fecha fin</strong>. El sistema cuenta los días de forma
              inclusiva (inicio y fin cuentan).
            </p>
            @if (form.hasError('endBeforeStart')) {
              <p class="error-hint">La fecha fin no puede ser anterior a la fecha de inicio.</p>
            }
            <div class="primary-support">
              <span class="support-label">Soporte de la incapacidad (imagen obligatoria)</span>
              <p class="support-hint">
                Primera imagen: documento o foto del <strong>soporte principal de la incapacidad</strong>. Si el caso es
                de <strong>3 o más días</strong>, más abajo deberá adjuntar un <strong>segundo</strong> archivo: historia
                clínica o incapacidad transcrita por EPS, según elija.
              </p>
              <div class="support-actions">
                <button mat-stroked-button type="button" (click)="triggerPrimaryCamera()">Tomar foto</button>
                <button mat-stroked-button type="button" (click)="triggerPrimaryGallery()">Elegir imagen</button>
                @if (primaryFile) {
                  <button mat-button type="button" color="warn" (click)="clearPrimaryFile()">Quitar</button>
                }
              </div>
              <input
                #primaryCameraInput
                type="file"
                class="sr-only"
                accept="image/*"
                capture="environment"
                (change)="onPrimaryFileSelected($event)"
              />
              <input
                #primaryGalleryInput
                type="file"
                class="sr-only"
                accept="image/*"
                (change)="onPrimaryFileSelected($event)"
              />
              @if (primaryPreviewUrl) {
                <div class="preview-wrap">
                  <img [src]="primaryPreviewUrl" alt="Soporte incapacidad" class="preview-img" />
                </div>
              }
            </div>
            @if (longAbsenceRequired()) {
              <div class="long-absence-block">
                <p class="hint-strong">
                  Esta incapacidad es de <strong>{{ inclusiveDays() }}</strong> días (3 o más). Además de la imagen
                  anterior, indique si el <strong>segundo soporte</strong> es
                  <strong>historia clínica</strong> o <strong>incapacidad transcrita por EPS</strong> y adjunte esa
                  imagen.
                </p>
                <mat-radio-group formControlName="long_absence_document_kind" class="radio-col">
                  <mat-radio-button value="historia_clinica">Historia clínica</mat-radio-button>
                  <mat-radio-button value="incapacidad_eps">Incapacidad transcrita por EPS</mat-radio-button>
                </mat-radio-group>
                @if (selectedKind() === 'historia_clinica') {
                  <div class="extra-support">
                    <span class="support-label">Soporte adicional — historia clínica (obligatorio)</span>
                    <p class="support-hint">Adjunte la imagen de la historia clínica.</p>
                    <div class="support-actions">
                      <button mat-stroked-button type="button" (click)="triggerHistoriaCamera()">Tomar foto</button>
                      <button mat-stroked-button type="button" (click)="triggerHistoriaGallery()">Elegir imagen</button>
                      @if (historiaFile) {
                        <button mat-button type="button" color="warn" (click)="clearHistoriaFile()">Quitar</button>
                      }
                    </div>
                    <input
                      #historiaCameraInput
                      type="file"
                      class="sr-only"
                      accept="image/*"
                      capture="environment"
                      (change)="onHistoriaFileSelected($event)"
                    />
                    <input
                      #historiaGalleryInput
                      type="file"
                      class="sr-only"
                      accept="image/*"
                      (change)="onHistoriaFileSelected($event)"
                    />
                    @if (historiaPreviewUrl) {
                      <div class="preview-wrap">
                        <img [src]="historiaPreviewUrl" alt="Historia clínica" class="preview-img" />
                      </div>
                    }
                  </div>
                }
                @if (selectedKind() === 'incapacidad_eps') {
                  <div class="extra-support">
                    <span class="support-label">Incapacidad transcrita por EPS</span>
                    <p class="support-hint">Adjunte obligatoriamente una <strong>foto</strong> del documento.</p>
                    <div class="support-actions">
                      <button mat-stroked-button type="button" (click)="triggerEpsCamera()">Tomar foto</button>
                      <button mat-stroked-button type="button" (click)="triggerEpsGallery()">Elegir imagen</button>
                      @if (epsPhotoFile) {
                        <button mat-button type="button" color="warn" (click)="clearEpsFile()">Quitar foto</button>
                      }
                    </div>
                    <input
                      #epsCameraInput
                      type="file"
                      class="sr-only"
                      accept="image/*"
                      capture="environment"
                      (change)="onEpsFileSelected($event)"
                    />
                    <input
                      #epsGalleryInput
                      type="file"
                      class="sr-only"
                      accept="image/*"
                      (change)="onEpsFileSelected($event)"
                    />
                    @if (epsPreviewUrl) {
                      <div class="preview-wrap">
                        <img [src]="epsPreviewUrl" alt="Incapacidad transcrita" class="preview-img" />
                      </div>
                    }
                  </div>
                }
              </div>
            }
            @if (!auth.hasAnyRole(['ADMIN', 'MANAGEMENT'])) {
              <p class="hint">El registro quedará pendiente hasta que gerencia o administración lo apruebe o rechace.</p>
            }
          }
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="!catalogsReady() || form.invalid || loading || !extrasValid()"
        >
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
      min-width: min(100%, 420px);
      padding-top: 0.5rem;
    }
    .pick-hint {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      margin: 0.25rem 0 0.75rem;
      line-height: 1.45;
    }
    .full {
      width: 100%;
    }
    .hint {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.65);
      margin: 0 0 0.5rem;
    }
    .date-hint {
      font-size: 0.8125rem;
      color: rgba(0, 0, 0, 0.55);
      margin: -0.25rem 0 0.75rem;
      line-height: 1.45;
    }
    .primary-support {
      margin-bottom: 1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: #FCEDD9;
    }
    .error-hint {
      font-size: 0.8125rem;
      color: #C7272D;
      margin: -0.35rem 0 0.75rem;
    }
    .hint-strong {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.75);
      margin: 0 0 0.75rem;
      line-height: 1.45;
    }
    .long-absence-block {
      margin-bottom: 1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 8px;
      background: rgba(25, 118, 210, 0.06);
      border: 1px solid rgba(25, 118, 210, 0.2);
    }
    .extra-support {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px dashed rgba(25, 118, 210, 0.35);
    }
    .radio-col {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      align-items: flex-start;
    }
    .support-label {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 500;
    }
    .support-hint {
      font-size: 0.8125rem;
      color: rgba(0, 0, 0, 0.55);
      margin: 0.25rem 0 0.5rem;
      line-height: 1.4;
    }
    .support-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .preview-wrap {
      margin-top: 0.35rem;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.12);
      max-width: 100%;
    }
    .preview-img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: contain;
      vertical-align: middle;
      background: #FCEDD9;
    }
  `,
})
export class IncapacityCreateDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly ref = inject(MatDialogRef<IncapacityCreateDialogComponent>);

  @ViewChild('primaryCameraInput') primaryCameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('primaryGalleryInput') primaryGalleryInput?: ElementRef<HTMLInputElement>;
  @ViewChild('historiaCameraInput') historiaCameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('historiaGalleryInput') historiaGalleryInput?: ElementRef<HTMLInputElement>;
  @ViewChild('epsCameraInput') epsCameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('epsGalleryInput') epsGalleryInput?: ElementRef<HTMLInputElement>;

  employeeOptions: SearchableOption<number>[] = [];
  temporalOptions: SearchableOption<number>[] = [];
  epsOptions: SearchableOption<number>[] = [];
  dxOptions: SearchableOption<number>[] = [];
  readonly typeOptions = INCAPACITY_TYPE_OPTIONS;
  readonly catalogsReady = signal(false);
  loading = false;

  primaryFile: File | null = null;
  primaryPreviewUrl: string | null = null;
  historiaFile: File | null = null;
  historiaPreviewUrl: string | null = null;
  epsPhotoFile: File | null = null;
  epsPreviewUrl: string | null = null;

  readonly form = this.fb.group({
    employee_id: this.fb.nonNullable.control(0, { validators: [Validators.required, Validators.min(1)] }),
    type: this.fb.nonNullable.control('general_illness', Validators.required),
    temporal_category_id: this.fb.control<number | null>(null, Validators.required),
    eps_arl_id: this.fb.control<number | null>(null),
    diagnosis_id: this.fb.control<number | null>(null),
    description: this.fb.nonNullable.control('', Validators.required),
    start_date: this.fb.control<Date | null>(null, Validators.required),
    end_date: this.fb.control<Date | null>(null),
    long_absence_document_kind: this.fb.control<'historia_clinica' | 'incapacidad_eps' | null>(null),
  });

  private readonly secondaryFields = [
    'type',
    'temporal_category_id',
    'eps_arl_id',
    'diagnosis_id',
    'description',
    'start_date',
    'end_date',
    'long_absence_document_kind',
  ] as const;

  ngOnInit(): void {
    this.form.setValidators([this.dateOrderValidator]);
    this.setSecondaryEnabled(false);

    this.api.getAllPages<EmployeeOpt>('/employees').subscribe((employees) => {
      this.employeeOptions = employees.map((x) => ({
        value: x.id,
        label: `${x.name} — ${x.identification_number}`,
      }));
    });

    this.form.controls.employee_id.valueChanges.subscribe((id) => {
      if (!id || id < 1) {
        this.catalogsReady.set(false);
        this.resetSecondaryFields();
        this.setSecondaryEnabled(false);
        return;
      }
      this.loadCatalogsForEmployee(id);
    });

    this.form.valueChanges.subscribe(() => this.syncLongAbsenceValidators());
    this.form.get('long_absence_document_kind')?.valueChanges.subscribe(() => {
      this.clearHistoriaFile();
      this.clearEpsFile();
    });
  }

  private setSecondaryEnabled(on: boolean): void {
    for (const k of this.secondaryFields) {
      const c = this.form.get(k);
      if (on) {
        c?.enable({ emitEvent: false });
      } else {
        c?.disable({ emitEvent: false });
      }
    }
  }

  private resetSecondaryFields(): void {
    this.form.patchValue(
      {
        type: 'general_illness',
        temporal_category_id: null,
        eps_arl_id: null,
        diagnosis_id: null,
        description: '',
        start_date: null,
        end_date: null,
        long_absence_document_kind: null,
      },
      { emitEvent: false },
    );
    this.clearPrimaryFile();
    this.clearHistoriaFile();
    this.clearEpsFile();
  }

  private loadCatalogsForEmployee(employeeId: number): void {
    forkJoin({
      emp: this.api.get<EmployeeDetail>(`/employees/${employeeId}`),
      options: this.api.get<FormOptions>('/incapacity-notes/form-options'),
    }).subscribe({
      next: ({ emp, options }) => {
        let opts = options.temporal_categories.map((x) => ({ value: x.id, label: x.name }));
        const tid = emp.temporal_category_id;
        if (
          tid != null &&
          tid > 0 &&
          !opts.some((o) => o.value === tid) &&
          emp.temporal_category_name
        ) {
          opts = [{ value: tid, label: emp.temporal_category_name }, ...opts];
        }
        this.temporalOptions = opts;
        this.epsOptions = options.eps_arl.map((x) => ({
          value: x.id,
          label: `${x.kind === 'eps' ? 'EPS' : 'ARL'} — ${x.name}`,
        }));
        this.dxOptions = options.diagnoses.map((x) => ({
          value: x.id,
          label: `${x.code} — ${x.name}`,
        }));

        let temporalId: number | null = null;
        if (tid != null && tid > 0) {
          temporalId = tid;
        } else if (opts.length) {
          temporalId = opts[0].value;
        }

        this.resetSecondaryFields();
        this.form.patchValue(
          {
            type: 'general_illness',
            temporal_category_id: temporalId,
          },
          { emitEvent: false },
        );
        this.setSecondaryEnabled(true);
        this.catalogsReady.set(true);
        this.syncLongAbsenceValidators();
      },
      error: () => {
        this.catalogsReady.set(false);
        this.setSecondaryEnabled(false);
      },
    });
  }

  private readonly dateOrderValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('start_date')?.value as Date | null;
    const end = group.get('end_date')?.value as Date | null;
    if (!start || !end) {
      return null;
    }
    if (end.getTime() < start.getTime()) {
      return { endBeforeStart: true };
    }
    return null;
  };

  ngOnDestroy(): void {
    if (this.primaryPreviewUrl) {
      URL.revokeObjectURL(this.primaryPreviewUrl);
    }
    if (this.historiaPreviewUrl) {
      URL.revokeObjectURL(this.historiaPreviewUrl);
    }
    if (this.epsPreviewUrl) {
      URL.revokeObjectURL(this.epsPreviewUrl);
    }
  }

  extrasValid(): boolean {
    if (!this.primaryFile) {
      return false;
    }
    const days = this.inclusiveDays();
    if (days < 3) {
      return true;
    }
    const kind = this.form.getRawValue().long_absence_document_kind;
    if (!kind) {
      return false;
    }
    if (kind === 'historia_clinica') {
      return !!this.historiaFile;
    }
    return !!this.epsPhotoFile;
  }

  inclusiveDays(): number {
    const v = this.form.getRawValue();
    return this.computeInclusiveDays(v.start_date, v.end_date);
  }

  longAbsenceRequired(): boolean {
    return this.inclusiveDays() >= 3;
  }

  selectedKind(): 'historia_clinica' | 'incapacidad_eps' | null {
    return this.form.get('long_absence_document_kind')?.value ?? null;
  }

  private syncLongAbsenceValidators(): void {
    const k = this.form.get('long_absence_document_kind');
    if (this.longAbsenceRequired()) {
      k?.setValidators([Validators.required]);
    } else {
      k?.clearValidators();
      k?.setValue(null, { emitEvent: false });
    }
    k?.updateValueAndValidity({ emitEvent: false });
  }

  private computeInclusiveDays(start: Date | null, end: Date | null): number {
    if (!start) {
      return 0;
    }
    const s = start.getTime();
    const e = end != null ? end.getTime() : s;
    if (e < s) {
      return 0;
    }
    return Math.floor((e - s) / 86400000) + 1;
  }

  triggerPrimaryCamera(): void {
    this.primaryCameraInput?.nativeElement.click();
  }

  triggerPrimaryGallery(): void {
    this.primaryGalleryInput?.nativeElement.click();
  }

  onPrimaryFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (this.primaryPreviewUrl) {
        URL.revokeObjectURL(this.primaryPreviewUrl);
      }
      this.primaryFile = file;
      this.primaryPreviewUrl = URL.createObjectURL(file);
    }
    input.value = '';
  }

  clearPrimaryFile(): void {
    if (this.primaryPreviewUrl) {
      URL.revokeObjectURL(this.primaryPreviewUrl);
    }
    this.primaryPreviewUrl = null;
    this.primaryFile = null;
  }

  triggerHistoriaCamera(): void {
    this.historiaCameraInput?.nativeElement.click();
  }

  triggerHistoriaGallery(): void {
    this.historiaGalleryInput?.nativeElement.click();
  }

  onHistoriaFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (this.historiaPreviewUrl) {
        URL.revokeObjectURL(this.historiaPreviewUrl);
      }
      this.historiaFile = file;
      this.historiaPreviewUrl = URL.createObjectURL(file);
    }
    input.value = '';
  }

  clearHistoriaFile(): void {
    if (this.historiaPreviewUrl) {
      URL.revokeObjectURL(this.historiaPreviewUrl);
    }
    this.historiaPreviewUrl = null;
    this.historiaFile = null;
  }

  triggerEpsCamera(): void {
    this.epsCameraInput?.nativeElement.click();
  }

  triggerEpsGallery(): void {
    this.epsGalleryInput?.nativeElement.click();
  }

  onEpsFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (this.epsPreviewUrl) {
        URL.revokeObjectURL(this.epsPreviewUrl);
      }
      this.epsPhotoFile = file;
      this.epsPreviewUrl = URL.createObjectURL(file);
    }
    input.value = '';
  }

  clearEpsFile(): void {
    if (this.epsPreviewUrl) {
      URL.revokeObjectURL(this.epsPreviewUrl);
    }
    this.epsPreviewUrl = null;
    this.epsPhotoFile = null;
  }

  submit(): void {
    if (!this.catalogsReady() || this.form.invalid || !this.extrasValid()) {
      return;
    }
    const v = this.form.getRawValue();
    const days = this.computeInclusiveDays(v.start_date, v.end_date);
    if (days >= 3 && !v.long_absence_document_kind) {
      return;
    }
    this.loading = true;

    const body: Record<string, unknown> = {
      employee_id: v.employee_id,
      type: v.type,
      temporal_category_id: v.temporal_category_id,
      description: v.description,
      start_date: dateToYmd(v.start_date),
      status: this.auth.hasAnyRole(['ADMIN', 'MANAGEMENT']) ? 'active' : 'pending',
      long_absence_document_kind: days >= 3 ? v.long_absence_document_kind : null,
    };
    if (v.eps_arl_id != null) {
      body['eps_arl_id'] = v.eps_arl_id;
    }
    if (v.diagnosis_id != null) {
      body['diagnosis_id'] = v.diagnosis_id;
    }
    const endYmd = dateToYmd(v.end_date);
    if (endYmd) {
      body['end_date'] = endYmd;
    }
    const fd = new FormData();
    fd.append('payload', JSON.stringify(body));
    if (this.primaryFile) {
      fd.append('file', this.primaryFile, this.primaryFile.name);
    }
    if (days >= 3 && v.long_absence_document_kind === 'historia_clinica' && this.historiaFile) {
      fd.append('file_historia_clinica', this.historiaFile, this.historiaFile.name);
    }
    if (days >= 3 && v.long_absence_document_kind === 'incapacidad_eps' && this.epsPhotoFile) {
      fd.append('file_eps', this.epsPhotoFile, this.epsPhotoFile.name);
    }

    this.api.postFormData<IncapacityNoteRead>('/incapacity-notes', fd).subscribe({
      next: () => {
        this.loading = false;
        this.ref.close(true);
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
