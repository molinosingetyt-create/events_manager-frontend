import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { dateToYmd, ymdToDate } from '../../core/utils/date-api';
import { DateFieldComponent } from '../../shared/date-field/date-field.component';

export interface IncapacityExtensionDialogData {
  noteId: number;
  /** YYYY-MM-DD: fin de la incapacidad (o inicio si no hay fin); la prórroga no puede ser anterior. */
  minExtensionDate: string;
}

@Component({
  selector: 'em-incapacity-extension-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DateFieldComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Prórroga</h2>
      <mat-dialog-content>
        <p class="lead">
          Registro asociado a la incapacidad <strong>#{{ data.noteId }}</strong>. Todos los campos son obligatorios.
        </p>
        <p class="hint-min">
          La prórroga debe comenzar el mismo día o después del <strong>fin de la incapacidad</strong>
          ({{ data.minExtensionDate }}).
        </p>
        <form [formGroup]="form" class="form">
          <em-date-field label="Fecha inicio" [control]="form.controls.start_date" [min]="extensionMinDate" />
          <em-date-field label="Fecha fin" [control]="form.controls.end_date" [min]="extensionMinDate" />
          @if (form.hasError('endBeforeStart')) {
            <p class="error-hint">La fecha fin no puede ser anterior a la fecha de inicio.</p>
          }
          @if (form.hasError('beforeIncapacityEnd')) {
            <p class="error-hint">
              Las fechas deben ser iguales o posteriores al fin de la incapacidad ({{ data.minExtensionDate }}).
            </p>
          }
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nota</mat-label>
            <textarea matInput rows="3" formControlName="note" placeholder="Observaciones de la prórroga"></textarea>
          </mat-form-field>
          <div class="file-block">
            <span class="file-label">Imagen (obligatorio)</span>
            <div class="file-actions">
              <button mat-stroked-button type="button" (click)="triggerFilePick()">Elegir imagen</button>
              @if (selectedFile) {
                <button mat-button type="button" color="warn" (click)="clearFile()">Quitar</button>
              }
            </div>
            <input
              #fileEl
              type="file"
              class="sr-only"
              accept="image/*"
              (change)="onFile($event)"
            />
            @if (previewUrl) {
              <div class="preview-wrap">
                <img [src]="previewUrl" alt="Vista previa" class="preview-img" />
              </div>
            }
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="form.invalid || loading || !selectedFile"
        >
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Guardar prórroga
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .lead {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.65);
      margin: 0 0 0.75rem;
      line-height: 1.45;
    }
    .hint-min {
      font-size: 0.8125rem;
      color: rgba(0, 0, 0, 0.6);
      margin: 0 0 0.75rem;
      line-height: 1.4;
    }
    .form {
      display: flex;
      flex-direction: column;
      min-width: min(100%, 400px);
    }
    .full {
      width: 100%;
    }
    .error-hint {
      font-size: 0.8125rem;
      color: #C7272D;
      margin: -0.35rem 0 0.75rem;
    }
    .file-label {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 500;
    }
    .file-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.35rem 0 0.5rem;
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
      max-height: 200px;
      object-fit: contain;
      background: #FCEDD9;
    }
  `,
})
export class IncapacityExtensionDialogComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<IncapacityExtensionDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA) as IncapacityExtensionDialogData;

  @ViewChild('fileEl') fileInput?: ElementRef<HTMLInputElement>;

  loading = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  readonly extensionMinDate = ymdToDate(this.data.minExtensionDate) ?? new Date(2000, 0, 1);

  readonly form = this.fb.group({
    start_date: this.fb.control<Date | null>(null, Validators.required),
    end_date: this.fb.control<Date | null>(null, Validators.required),
    note: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(1)]),
  });

  constructor() {
    this.form.setValidators([this.dateOrderValidator, this.afterIncapacityEndValidator]);
  }

  private readonly dateOrderValidator: ValidatorFn = (group): ValidationErrors | null => {
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

  private readonly afterIncapacityEndValidator: ValidatorFn = (group): ValidationErrors | null => {
    const minD = this.extensionMinDate;
    for (const key of ['start_date', 'end_date'] as const) {
      const v = group.get(key)?.value as Date | null;
      if (v && v.getTime() < minD.getTime()) {
        return { beforeIncapacityEnd: true };
      }
    }
    return null;
  };

  triggerFilePick(): void {
    this.fileInput?.nativeElement.click();
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
    }
    input.value = '';
  }

  clearFile(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;
    this.selectedFile = null;
  }

  submit(): void {
    if (this.form.invalid || !this.selectedFile) {
      return;
    }
    const v = this.form.getRawValue();
    this.loading = true;
    const body = {
      start_date: dateToYmd(v.start_date),
      end_date: dateToYmd(v.end_date),
      note: v.note.trim(),
    };
    const fd = new FormData();
    fd.append('payload', JSON.stringify(body));
    fd.append('file', this.selectedFile, this.selectedFile.name);
    this.api.postFormData(`/incapacity-notes/${this.data.noteId}/extensions`, fd).subscribe({
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
