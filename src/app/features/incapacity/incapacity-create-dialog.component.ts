import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import {
  INCAPACITY_ADMIN_STATUS_OPTIONS,
  INCAPACITY_TYPE_OPTIONS,
} from '../../shared/searchable-select/select-options';

interface EmployeeOpt {
  id: number;
  name: string;
}

interface IncapacityNoteRead {
  id: number;
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
    SearchableSelectComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Nueva incapacidad / nota</h2>
      <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <em-searchable-select
          label="Empleado"
          [control]="form.controls.employee_id"
          [options]="employeeOptions"
        />
        <em-searchable-select label="Tipo" [control]="form.controls.type" [options]="typeOptions" />
        <mat-form-field appearance="outline" class="full">
          <mat-label>Descripción</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
        <div class="support-block">
          <span class="support-label">Soporte (opcional)</span>
          <p class="support-hint">Foto o imagen desde la galería o la cámara del dispositivo.</p>
          <div class="support-actions">
            <button mat-stroked-button type="button" (click)="triggerCamera()">Tomar foto</button>
            <button mat-stroked-button type="button" (click)="triggerGallery()">Elegir imagen</button>
            @if (selectedFile) {
              <button mat-button type="button" color="warn" (click)="clearFile()">Quitar</button>
            }
          </div>
          <input
            #cameraInput
            type="file"
            class="sr-only"
            accept="image/*"
            capture="environment"
            (change)="onFileSelected($event)"
          />
          <input
            #galleryInput
            type="file"
            class="sr-only"
            accept="image/*"
            (change)="onFileSelected($event)"
          />
          @if (previewUrl) {
            <div class="preview-wrap">
              <img [src]="previewUrl" alt="Vista previa del soporte" class="preview-img" />
            </div>
          }
        </div>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Fecha inicio</mat-label>
          <input matInput type="date" formControlName="start_date" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Fecha fin (opcional)</mat-label>
          <input matInput type="date" formControlName="end_date" />
        </mat-form-field>
        @if (!auth.hasAnyRole(['ADMIN', 'MANAGEMENT'])) {
          <p class="hint">El registro quedará pendiente hasta que gerencia o administración lo apruebe o rechace.</p>
        }
        @if (auth.hasAnyRole(['ADMIN', 'MANAGEMENT'])) {
          <em-searchable-select
            label="Estado"
            [control]="form.controls.status"
            [options]="adminStatusOptions"
          />
        }
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
      min-width: min(100%, 420px);
      padding-top: 0.5rem;
    }
    .full {
      width: 100%;
    }
    .hint {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.65);
      margin: 0 0 0.5rem;
    }
    .support-block {
      margin-bottom: 1rem;
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
      background: #f5f5f5;
    }
  `,
})
export class IncapacityCreateDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly ref = inject(MatDialogRef<IncapacityCreateDialogComponent>);

  @ViewChild('cameraInput') cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput?: ElementRef<HTMLInputElement>;

  employeeOptions: SearchableOption<number>[] = [];
  readonly typeOptions = INCAPACITY_TYPE_OPTIONS;
  readonly adminStatusOptions = INCAPACITY_ADMIN_STATUS_OPTIONS;
  loading = false;

  selectedFile: File | null = null;
  previewUrl: string | null = null;

  readonly form = this.fb.nonNullable.group({
    employee_id: [0, [Validators.required, Validators.min(1)]],
    type: ['incapacity', Validators.required],
    description: ['', Validators.required],
    start_date: ['', Validators.required],
    end_date: [''],
    status: ['active', Validators.required],
  });

  ngOnInit(): void {
    this.api.getAllPages<EmployeeOpt>('/employees').subscribe((items) => {
      this.employeeOptions = items.map((x) => ({ value: x.id, label: x.name }));
      if (items.length) {
        this.form.patchValue({ employee_id: items[0].id });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  triggerCamera(): void {
    this.cameraInput?.nativeElement.click();
  }

  triggerGallery(): void {
    this.galleryInput?.nativeElement.click();
  }

  onFileSelected(ev: Event): void {
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
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      employee_id: v.employee_id,
      type: v.type,
      description: v.description,
      start_date: v.start_date,
      status: this.auth.hasAnyRole(['ADMIN', 'MANAGEMENT']) ? v.status : 'pending',
    };
    if (v.end_date) {
      body['end_date'] = v.end_date;
    }
    this.api
      .post<IncapacityNoteRead>('/incapacity-notes', body)
      .pipe(
        switchMap((created) => {
          if (!this.selectedFile) {
            return of(created);
          }
          const fd = new FormData();
          fd.append('file', this.selectedFile, this.selectedFile.name);
          return this.api.postFormData<IncapacityNoteRead>(
            `/incapacity-notes/${created.id}/attachments`,
            fd,
          );
        }),
      )
      .subscribe({
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
