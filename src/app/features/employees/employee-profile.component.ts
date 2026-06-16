import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { publicAssetUrl } from '../../core/utils/public-asset-url';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  COLLABORATOR_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  HIERARCHICAL_LEVEL_OPTIONS,
  LINKAGE_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  WORK_MODALITY_OPTIONS,
  WORK_SITE_OPTIONS,
  DOCUMENT_KIND_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
  TRAINING_TYPE_OPTIONS,
} from './employee-profile-options';
import { EmployeeProfileAlertsPanelComponent } from './employee-profile-alerts-panel.component';
import { EmployeeProfileCustomTabComponent } from './employee-profile-custom-tab.component';
import { EmployeeProfilePayrollTabComponent } from './employee-profile-payroll-tab.component';
import { EmployeeProfileCompetenciesTabComponent } from './employee-profile-competencies-tab.component';
import { EmployeeProfileHistoryTabComponent } from './employee-profile-history-tab.component';
import { EmployeeProfileSstTabComponent } from './employee-profile-sst-tab.component';
import type {
  EducationRow,
  EmployeeDocumentRow,
  EmployeeProfileFull,
  TrainingRow,
} from './employee-profile.types';

@Component({
  selector: 'em-employee-profile',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    SearchableSelectComponent,
    EmployeeProfileCompetenciesTabComponent,
    EmployeeProfileSstTabComponent,
    EmployeeProfileHistoryTabComponent,
    EmployeeProfileAlertsPanelComponent,
    EmployeeProfileCustomTabComponent,
    EmployeeProfilePayrollTabComponent,
  ],
  template: `
    <div class="page-head">
      <button mat-icon-button type="button" routerLink="/app/employees" aria-label="Volver al listado">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="head-text">
        <h1>Expediente del colaborador</h1>
        @if (profile) {
          <p class="subtitle">{{ profile.employee.name }} · {{ profile.employee.identification_number }}</p>
        }
      </div>
      @if (profile) {
        <div class="head-actions">
          @if (canExport) {
            <a
              mat-stroked-button
              [routerLink]="['/app/employees', profile.employee.id, 'expediente', 'imprimir']"
              target="_blank"
            >
              <mat-icon>picture_as_pdf</mat-icon>
              PDF
            </a>
          }
          @if (canSeeAlerts) {
            <em-profile-alerts-panel [employeeId]="profile.employee.id" [enabled]="true" />
          }
          <div class="completeness" matTooltip="Campos diligenciados del expediente">
            <span class="completeness-label">Completitud</span>
            <strong>{{ profile.completeness_percent }}%</strong>
          </div>
        </div>
      }
    </div>

    @if (loading) {
      <div class="loading"><mat-spinner diameter="44" /></div>
    } @else if (error) {
      <mat-card><mat-card-content>No se pudo cargar el expediente o no tiene permiso.</mat-card-content></mat-card>
    } @else if (profile) {
      <mat-card class="summary-card">
        <mat-card-content>
          <div class="summary-grid">
            <span><strong>Cargo:</strong> {{ profile.employee.position }}</span>
            <span><strong>Área:</strong> {{ profile.employee.area_name }}</span>
            <span><strong>Líder:</strong> {{ profile.employee.leader_name || '—' }}</span>
            <span><strong>Actualizado:</strong> {{ profile.employee.updated_at | date: 'short' }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group animationDuration="0ms">
        <mat-tab label="Información personal">
          <form [formGroup]="personalForm" class="tab-form" (ngSubmit)="savePersonal()">
            @if (profile) {
              <p class="autofill-hint">
                Datos tomados del registro del colaborador (nombre, documento, cargo, área y temporal).
                Se completan automáticamente al abrir el expediente.
              </p>
              <div class="photo-row">
                <div class="photo-preview-wrap">
                  @if (photoPreviewUrl) {
                    <img class="photo-preview" [src]="photoPreviewUrl" alt="Foto del colaborador" />
                  } @else {
                    <div class="photo-placeholder" aria-hidden="true">
                      <mat-icon>person</mat-icon>
                    </div>
                  }
                </div>
                <div class="photo-actions">
                  <span class="photo-label">Foto para hoja de vida</span>
                  <span class="photo-hint">JPEG, PNG o WebP. Se guarda en el almacenamiento corporativo (S3).</span>
                  @if (canEdit) {
                    <input
                      #photoInput
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      (change)="onPhotoFile($event)"
                    />
                    <button
                      mat-stroked-button
                      type="button"
                      (click)="photoInput.click()"
                      [disabled]="uploadingPhoto"
                    >
                      <mat-icon>photo_camera</mat-icon>
                      {{ photoPreviewUrl ? 'Cambiar foto' : 'Subir foto' }}
                    </button>
                    @if (selectedPhotoFile) {
                      <button
                        mat-flat-button
                        color="primary"
                        type="button"
                        (click)="uploadPhoto()"
                        [disabled]="uploadingPhoto"
                      >
                        Guardar foto
                      </button>
                    }
                  }
                </div>
              </div>
            }
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Primer nombre</mat-label>
                <input matInput formControlName="first_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Segundo nombre</mat-label>
                <input matInput formControlName="second_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Primer apellido</mat-label>
                <input matInput formControlName="first_surname" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Segundo apellido</mat-label>
                <input matInput formControlName="second_surname" />
              </mat-form-field>
              <em-searchable-select
                label="Tipo de documento"
                [control]="personalForm.controls.document_type"
                [options]="documentTypeOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>N.º documento (registro base)</mat-label>
                <input matInput [value]="profile.employee.identification_number" disabled />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha de nacimiento</mat-label>
                <input matInput type="date" formControlName="birth_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Edad</mat-label>
                <input matInput [value]="ageLabel" disabled />
              </mat-form-field>
              <em-searchable-select
                label="Género"
                [control]="personalForm.controls.gender"
                [options]="genderOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <em-searchable-select
                label="Estado civil"
                [control]="personalForm.controls.marital_status"
                [options]="maritalStatusOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Número de hijos</mat-label>
                <input matInput type="number" min="0" formControlName="children_count" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ciudad de residencia</mat-label>
                <input matInput formControlName="residence_city" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="residence_address" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Barrio</mat-label>
                <input matInput formControlName="neighborhood" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Teléfono / celular</mat-label>
                <input matInput formControlName="phone" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Correo personal</mat-label>
                <input matInput type="email" formControlName="personal_email" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Correo corporativo</mat-label>
                <input matInput type="email" formControlName="corporate_email" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Grupo sanguíneo</mat-label>
                <input matInput formControlName="blood_type" placeholder="Ej. O" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>RH</mat-label>
                <input matInput formControlName="rh_factor" placeholder="Ej. +" />
              </mat-form-field>
            </div>

            <h3 class="section-title">Personas a cargo</h3>
            <div formArrayName="dependents" class="dependents">
              @for (dep of dependents.controls; track $index) {
                <div class="dependent-row" [formGroupName]="$index">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="full_name" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Parentesco</mat-label>
                    <input matInput formControlName="relationship" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Fecha nacimiento</mat-label>
                    <input matInput type="date" formControlName="birth_date" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Escolaridad</mat-label>
                    <input matInput formControlName="schooling" />
                  </mat-form-field>
                  @if (canEdit) {
                    <button mat-icon-button type="button" (click)="removeDependent($index)" aria-label="Quitar">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
            @if (canEdit) {
              <button mat-stroked-button type="button" (click)="addDependent()">
                <mat-icon>person_add</mat-icon>
                Agregar persona a cargo
              </button>
              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="saving">
                  Guardar información personal
                </button>
              </div>
            }
          </form>
        </mat-tab>

        <mat-tab label="Información laboral">
          <form [formGroup]="laborForm" class="tab-form" (ngSubmit)="saveLabor()">
            <div class="grid-2">
              <em-searchable-select
                label="Tipo de vinculación"
                [control]="laborForm.controls.linkage_type"
                [options]="linkageTypeOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Empresa de servicios temporales</mat-label>
                <input matInput formControlName="temp_agency_name" />
              </mat-form-field>
              <em-searchable-select
                label="Sede / ciudad de trabajo"
                [control]="laborForm.controls.work_site_city"
                [options]="workSiteOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <em-searchable-select
                label="Nivel jerárquico"
                [control]="laborForm.controls.hierarchical_level"
                [options]="hierarchicalLevelOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Fecha de ingreso</mat-label>
                <input matInput type="date" formControlName="hire_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Antigüedad</mat-label>
                <input matInput [value]="seniorityLabel" disabled />
              </mat-form-field>
              <em-searchable-select
                label="Tipo de contrato"
                [control]="laborForm.controls.contract_type"
                [options]="contractTypeOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Vencimiento contrato</mat-label>
                <input matInput type="date" formControlName="contract_end_date" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Salario base</mat-label>
                <input matInput type="number" min="0" formControlName="base_salary" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo de jornada</mat-label>
                <input matInput formControlName="work_schedule_type" />
              </mat-form-field>
              <em-searchable-select
                label="Modalidad de trabajo"
                [control]="laborForm.controls.work_modality"
                [options]="workModalityOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>N.º afiliación EPS</mat-label>
                <input matInput formControlName="eps_affiliation_number" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>EPS</mat-label>
                <input matInput formControlName="eps_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fondo de pensiones</mat-label>
                <input matInput formControlName="pension_fund" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fondo de cesantías</mat-label>
                <input matInput formControlName="severance_fund" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Caja de compensación</mat-label>
                <input matInput formControlName="family_compensation_box" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>ARL</mat-label>
                <input matInput formControlName="arl_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nivel de riesgo ARL</mat-label>
                <input matInput formControlName="arl_risk_level" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Banco</mat-label>
                <input matInput formControlName="bank_name" />
              </mat-form-field>
              <em-searchable-select
                label="Tipo de cuenta"
                [control]="laborForm.controls.bank_account_type"
                [options]="bankAccountTypeOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline">
                <mat-label>Número de cuenta</mat-label>
                <input matInput formControlName="bank_account_number" />
              </mat-form-field>
              <em-searchable-select
                label="Estado del colaborador"
                [control]="laborForm.controls.collaborator_status"
                [options]="collaboratorStatusOptions"
                [allowNull]="true"
                nullLabel="—"
              />
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>Notas</mat-label>
                <textarea matInput rows="2" formControlName="notes"></textarea>
              </mat-form-field>
            </div>
            @if (canEdit) {
              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="saving">
                  Guardar información laboral
                </button>
              </div>
            }
          </form>
        </mat-tab>

        <mat-tab label="Formación académica">
          <form [formGroup]="educationForm" class="tab-form" (ngSubmit)="saveEducation()">
            <div formArrayName="rows" class="career-list">
              @for (row of educationRows.controls; track $index) {
                @let eg = asGroup(row);
                <div class="career-card" [formGroupName]="$index">
                  <div class="grid-2">
                    <em-searchable-select
                      label="Nivel"
                      [control]="asControl(eg.controls['education_level'])"
                      [options]="educationLevelOptions"
                      [allowNull]="true"
                      nullLabel="—"
                    />
                    <em-searchable-select
                      label="Estado"
                      [control]="asControl(eg.controls['status'])"
                      [options]="educationStatusOptions"
                      [allowNull]="true"
                      nullLabel="—"
                    />
                    <mat-form-field appearance="outline">
                      <mat-label>Institución</mat-label>
                      <input matInput formControlName="institution" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Programa / título</mat-label>
                      <input matInput formControlName="program" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Año de graduación</mat-label>
                      <input matInput type="number" min="1950" max="2100" formControlName="graduation_year" />
                    </mat-form-field>
                    <div class="cert-cell span-2">
                      @if (eg.controls['certificate_url'].value) {
                        <a
                          mat-stroked-button
                          [href]="assetUrl(eg.controls['certificate_url'].value!)"
                          target="_blank"
                          rel="noopener"
                        >
                          <mat-icon>description</mat-icon>
                          Ver certificado
                        </a>
                      }
                      @if (canEdit) {
                        <input
                          type="file"
                          accept=".pdf,image/*,application/pdf"
                          (change)="onEducationCertFile($index, $event)"
                        />
                        <button
                          mat-stroked-button
                          type="button"
                          [disabled]="uploadingCert || !eg.controls['id'].value"
                          (click)="uploadEducationCertificate($index)"
                        >
                          Subir certificado
                        </button>
                        @if (!eg.controls['id'].value) {
                          <span class="cert-hint">Guarde el expediente para habilitar la carga.</span>
                        }
                      }
                    </div>
                  </div>
                  @if (canEdit) {
                    <button mat-icon-button type="button" class="remove-career" (click)="removeEducation($index)" aria-label="Quitar">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
            @if (canEdit) {
              <button mat-stroked-button type="button" (click)="addEducation()">
                <mat-icon>school</mat-icon>
                Agregar formación
              </button>
              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="saving">
                  Guardar formación académica
                </button>
              </div>
            } @else if (!educationRows.length) {
              <p class="empty-docs">Sin registros de formación.</p>
            }
          </form>
        </mat-tab>

        <mat-tab label="Capacitaciones">
          <form [formGroup]="trainingForm" class="tab-form" (ngSubmit)="saveTraining()">
            <div formArrayName="rows" class="career-list">
              @for (row of trainingRows.controls; track $index) {
                @let tg = asGroup(row);
                <div class="career-card" [formGroupName]="$index">
                  <div class="grid-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Nombre</mat-label>
                      <input matInput formControlName="name" required />
                    </mat-form-field>
                    <em-searchable-select
                      label="Tipo"
                      [control]="asControl(tg.controls['training_type'])"
                      [options]="trainingTypeOptions"
                      [allowNull]="true"
                      nullLabel="—"
                    />
                    <mat-form-field appearance="outline">
                      <mat-label>Proveedor</mat-label>
                      <input matInput formControlName="provider" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Fecha de finalización</mat-label>
                      <input matInput type="date" formControlName="completed_at" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Horas</mat-label>
                      <input matInput type="number" min="0" formControlName="hours" />
                    </mat-form-field>
                    <div class="cert-cell span-2">
                      @if (tg.controls['certificate_url'].value) {
                        <a
                          mat-stroked-button
                          [href]="assetUrl(tg.controls['certificate_url'].value!)"
                          target="_blank"
                          rel="noopener"
                        >
                          <mat-icon>description</mat-icon>
                          Ver certificado
                        </a>
                      }
                      @if (canEdit) {
                        <input
                          type="file"
                          accept=".pdf,image/*,application/pdf"
                          (change)="onTrainingCertFile($index, $event)"
                        />
                        <button
                          mat-stroked-button
                          type="button"
                          [disabled]="uploadingCert || !tg.controls['id'].value"
                          (click)="uploadTrainingCertificate($index)"
                        >
                          Subir certificado
                        </button>
                        @if (!tg.controls['id'].value) {
                          <span class="cert-hint">Guarde el expediente para habilitar la carga.</span>
                        }
                      }
                    </div>
                  </div>
                  @if (canEdit) {
                    <button mat-icon-button type="button" class="remove-career" (click)="removeTraining($index)" aria-label="Quitar">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
            @if (canEdit) {
              <button mat-stroked-button type="button" (click)="addTraining()">
                <mat-icon>menu_book</mat-icon>
                Agregar capacitación
              </button>
              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="saving">
                  Guardar capacitaciones
                </button>
              </div>
            } @else if (!trainingRows.length) {
              <p class="empty-docs">Sin capacitaciones registradas.</p>
            }
          </form>
        </mat-tab>

        <mat-tab label="Experiencia previa">
          <form [formGroup]="priorJobsForm" class="tab-form" (ngSubmit)="savePriorJobs()">
            <div formArrayName="rows" class="career-list">
              @for (row of priorJobRows.controls; track $index) {
                @let jg = asGroup(row);
                <div class="career-card" [formGroupName]="$index">
                  <div class="grid-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Empresa</mat-label>
                      <input matInput formControlName="company_name" required />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Cargo</mat-label>
                      <input matInput formControlName="position" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Fecha inicio</mat-label>
                      <input matInput type="date" formControlName="start_date" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Fecha fin</mat-label>
                      <input matInput type="date" formControlName="end_date" />
                    </mat-form-field>
                    @if (jg.controls['duration_text'].value) {
                      <mat-form-field appearance="outline">
                        <mat-label>Duración</mat-label>
                        <input matInput [value]="jg.controls['duration_text'].value" disabled />
                      </mat-form-field>
                    }
                    <mat-form-field appearance="outline">
                      <mat-label>Sector económico</mat-label>
                      <input matInput formControlName="economic_sector" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="span-2">
                      <mat-label>Motivo de retiro</mat-label>
                      <input matInput formControlName="leave_reason" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Teléfono referencia</mat-label>
                      <input matInput formControlName="reference_phone" />
                    </mat-form-field>
                  </div>
                  @if (canEdit) {
                    <button mat-icon-button type="button" class="remove-career" (click)="removePriorJob($index)" aria-label="Quitar">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
            @if (canEdit) {
              <button mat-stroked-button type="button" (click)="addPriorJob()">
                <mat-icon>work_history</mat-icon>
                Agregar experiencia
              </button>
              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="saving">
                  Guardar experiencia previa
                </button>
              </div>
            } @else if (!priorJobRows.length) {
              <p class="empty-docs">Sin experiencia laboral previa registrada.</p>
            }
          </form>
        </mat-tab>

        @if (profile) {
          <mat-tab label="Campos adicionales">
            <em-profile-custom-tab
              [employeeId]="profile.employee.id"
              [canEdit]="canEdit"
              [data]="profile"
              (updated)="onExtendedUpdated($event)"
            />
          </mat-tab>
          <mat-tab label="Nómina">
            <em-profile-payroll-tab
              [employeeId]="profile.employee.id"
              [canEditPayroll]="canEditPayroll"
              [data]="profile"
              (updated)="onExtendedUpdated($event)"
            />
          </mat-tab>
          <mat-tab label="Competencias">
            <em-profile-competencies-tab
              [employeeId]="profile.employee.id"
              [canEdit]="canEdit"
              [data]="profile"
              (updated)="onExtendedUpdated($event)"
            />
          </mat-tab>
          <mat-tab label="SST">
            <em-profile-sst-tab
              [employeeId]="profile.employee.id"
              [canEdit]="canEdit"
              [data]="profile"
              (updated)="onExtendedUpdated($event)"
            />
          </mat-tab>
          <mat-tab label="Historial interno">
            <em-profile-history-tab
              [employeeId]="profile.employee.id"
              [canEdit]="canEdit"
              [data]="profile"
              (updated)="onExtendedUpdated($event)"
            />
          </mat-tab>
        }

        <mat-tab label="Documentos">
          <div class="tab-form docs-tab">
            @if (canEditDocuments) {
              <form class="upload-form" [formGroup]="uploadForm" (ngSubmit)="uploadDocument()">
                <h3 class="section-title">Cargar documento</h3>
                <div class="grid-2">
                  <em-searchable-select
                    label="Tipo de documento"
                    [control]="uploadForm.controls.document_kind"
                    [options]="documentKindOptions"
                  />
                  <mat-form-field appearance="outline">
                    <mat-label>Nombre visible</mat-label>
                    <input matInput formControlName="display_name" placeholder="Opcional" />
                  </mat-form-field>
                  <em-searchable-select
                    label="Estado"
                    [control]="uploadForm.controls.status"
                    [options]="documentStatusOptions"
                  />
                  <mat-form-field appearance="outline">
                    <mat-label>Vencimiento</mat-label>
                    <input matInput type="date" formControlName="expires_at" />
                  </mat-form-field>
                  <div class="span-2 file-pick">
                    <input
                      #docFileInput
                      type="file"
                      accept=".pdf,image/*,application/pdf"
                      (change)="onDocFile($event)"
                    />
                  </div>
                </div>
                <button mat-flat-button color="primary" type="submit" [disabled]="uploading || !selectedFile">
                  <mat-icon>upload_file</mat-icon>
                  Subir archivo (PDF o imagen)
                </button>
              </form>
            }
            <h3 class="section-title">Documentos cargados</h3>
            @if (!profile.documents.length) {
              <p class="empty-docs">Sin documentos adjuntos.</p>
            } @else {
              <table mat-table [dataSource]="profile.documents" class="docs-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Documento</th>
                  <td mat-cell *matCellDef="let d">
                    <strong>{{ d.display_name }}</strong>
                    <span class="kind">{{ d.document_kind_label }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="doc-status" [class]="'doc-status--' + d.status">{{ d.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="meta">
                  <th mat-header-cell *matHeaderCellDef>Carga</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.created_at | date: 'short' }}
                    @if (d.uploaded_by_name) {
                      <span class="uploader"> · {{ d.uploaded_by_name }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let d">
                    <a mat-icon-button [href]="assetUrl(d.file_url)" target="_blank" rel="noopener" matTooltip="Ver / descargar">
                      <mat-icon>download</mat-icon>
                    </a>
                    @if (canEditDocuments) {
                      <button mat-icon-button type="button" (click)="deleteDocument(d)" matTooltip="Eliminar">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="docColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: docColumns"></tr>
              </table>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: `
    .page-head {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .head-text {
      flex: 1;
    }
    .head-text h1 {
      margin: 0;
      font-size: 1.35rem;
    }
    .subtitle {
      margin: 0.2rem 0 0;
      color: rgba(10, 10, 10, 0.55);
      font-size: 0.88rem;
    }
    .head-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .completeness {
      text-align: right;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      background: rgba(0, 102, 204, 0.08);
    }
    .completeness-label {
      display: block;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(10, 10, 10, 0.5);
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .summary-card {
      margin-bottom: 1rem;
    }
    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.5rem;
      font-size: 0.88rem;
    }
    .tab-form {
      padding: 1.25rem 0.5rem 1.5rem;
    }
    .autofill-hint {
      margin: 0 0 1rem;
      padding: 0.65rem 0.85rem;
      font-size: 0.82rem;
      line-height: 1.4;
      color: rgba(16, 56, 71, 0.85);
      background: rgba(0, 102, 204, 0.06);
      border-radius: 8px;
      border: 1px solid rgba(0, 102, 204, 0.15);
    }
    .photo-row {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(10, 10, 10, 0.08);
    }
    .photo-preview-wrap {
      flex-shrink: 0;
    }
    .photo-preview,
    .photo-placeholder {
      width: 96px;
      height: 96px;
      border-radius: 12px;
      object-fit: cover;
    }
    .photo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 10, 0.06);
      color: rgba(10, 10, 10, 0.35);
    }
    .photo-placeholder mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }
    .photo-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
    }
    .photo-label {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .photo-hint {
      font-size: 0.78rem;
      color: rgba(10, 10, 10, 0.55);
      max-width: 320px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 0.25rem 1rem;
    }
    .span-2 {
      grid-column: 1 / -1;
    }
    .section-title {
      margin: 1.25rem 0 0.75rem;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .dependent-row {
      display: grid;
      grid-template-columns: 1.2fr 0.9fr 0.9fr 0.9fr auto;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .career-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .career-card {
      position: relative;
      padding: 1rem 2.5rem 0.5rem 1rem;
      border: 1px solid rgba(10, 10, 10, 0.1);
      border-radius: 8px;
      background: rgba(10, 10, 10, 0.02);
    }
    .remove-career {
      position: absolute;
      top: 0.25rem;
      right: 0.25rem;
    }
    .cert-cell {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }
    .cert-hint {
      font-size: 0.78rem;
      color: rgba(10, 10, 10, 0.5);
    }
    .actions {
      margin-top: 1.25rem;
    }
    .docs-tab .upload-form {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(10, 10, 10, 0.1);
    }
    .file-pick input[type='file'] {
      font-size: 0.85rem;
    }
    .docs-table {
      width: 100%;
    }
    .kind {
      display: block;
      font-size: 0.72rem;
      color: rgba(10, 10, 10, 0.5);
    }
    .uploader {
      font-size: 0.78rem;
      color: rgba(10, 10, 10, 0.45);
    }
    .empty-docs {
      color: rgba(10, 10, 10, 0.55);
      font-size: 0.9rem;
    }
    .doc-status {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .doc-status--vigente {
      color: #1b7a3d;
    }
    .doc-status--vencido {
      color: #b00020;
    }
    .doc-status--pendiente {
      color: #a67c00;
    }
    @media (max-width: 900px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
      .dependent-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class EmployeeProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;
  readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
  readonly linkageTypeOptions = LINKAGE_TYPE_OPTIONS;
  readonly workSiteOptions = WORK_SITE_OPTIONS;
  readonly hierarchicalLevelOptions = HIERARCHICAL_LEVEL_OPTIONS;
  readonly contractTypeOptions = CONTRACT_TYPE_OPTIONS;
  readonly workModalityOptions = WORK_MODALITY_OPTIONS;
  readonly bankAccountTypeOptions = BANK_ACCOUNT_TYPE_OPTIONS;
  readonly collaboratorStatusOptions = COLLABORATOR_STATUS_OPTIONS;
  readonly documentKindOptions = DOCUMENT_KIND_OPTIONS;
  readonly documentStatusOptions = DOCUMENT_STATUS_OPTIONS;
  readonly educationLevelOptions = EDUCATION_LEVEL_OPTIONS;
  readonly educationStatusOptions = EDUCATION_STATUS_OPTIONS;
  readonly trainingTypeOptions = TRAINING_TYPE_OPTIONS;
  readonly docColumns = ['name', 'status', 'meta', 'actions'];

  profile: EmployeeProfileFull | null = null;
  loading = true;
  error = false;
  saving = false;
  uploading = false;
  uploadingCert = false;
  uploadingPhoto = false;
  selectedPhotoFile: File | null = null;
  private educationCertFiles: (File | null)[] = [];
  private trainingCertFiles: (File | null)[] = [];
  ageLabel = '—';
  seniorityLabel = '—';
  canEdit = false;
  canEditDocuments = false;
  canExport = false;
  canSeeAlerts = false;
  canEditPayroll = false;
  selectedFile: File | null = null;

  uploadForm = this.fb.group({
    document_kind: ['cedula' as string, Validators.required],
    display_name: [''],
    status: ['vigente' as string, Validators.required],
    expires_at: [''],
  });

  personalForm = this.fb.group({
    first_name: [''],
    second_name: [''],
    first_surname: [''],
    second_surname: [''],
    document_type: [null as string | null],
    birth_date: [''],
    gender: [null as string | null],
    marital_status: [null as string | null],
    children_count: [null as number | null],
    residence_city: [''],
    residence_address: [''],
    neighborhood: [''],
    phone: [''],
    personal_email: [''],
    corporate_email: [''],
    blood_type: [''],
    rh_factor: [''],
    dependents: this.fb.array([] as ReturnType<typeof this.dependentGroup>[]),
  });

  laborForm = this.fb.group({
    linkage_type: [null as string | null],
    temp_agency_name: [''],
    work_site_city: [null as string | null],
    hierarchical_level: [null as string | null],
    hire_date: [''],
    contract_type: [null as string | null],
    contract_end_date: [''],
    base_salary: [null as number | null],
    work_schedule_type: [''],
    work_modality: [null as string | null],
    eps_affiliation_number: [''],
    eps_name: [''],
    pension_fund: [''],
    severance_fund: [''],
    family_compensation_box: [''],
    arl_name: [''],
    arl_risk_level: [''],
    bank_name: [''],
    bank_account_type: [null as string | null],
    bank_account_number: [''],
    collaborator_status: [null as string | null],
    notes: [''],
  });

  educationForm = this.fb.group({
    rows: this.fb.array([] as ReturnType<typeof this.educationGroup>[]),
  });

  trainingForm = this.fb.group({
    rows: this.fb.array([] as ReturnType<typeof this.trainingGroup>[]),
  });

  priorJobsForm = this.fb.group({
    rows: this.fb.array([] as ReturnType<typeof this.priorJobGroup>[]),
  });

  get dependents(): FormArray {
    return this.personalForm.controls.dependents;
  }

  get educationRows(): FormArray {
    return this.educationForm.controls.rows;
  }

  get trainingRows(): FormArray {
    return this.trainingForm.controls.rows;
  }

  get priorJobRows(): FormArray {
    return this.priorJobsForm.controls.rows;
  }

  ngOnInit(): void {
    this.canExport = this.auth.hasPermission('employees.profile.export');
    this.canSeeAlerts = this.auth.hasPermission('employees.profile.alerts');
    this.canEditPayroll = this.auth.hasPermission('employees.profile.payroll');
    if (!this.auth.hasPermission('employees.profile.full')) {
      void this.router.navigate(['/app/employees']);
      return;
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/app/employees']);
      return;
    }
    this.load(id);
  }

  private dependentGroup() {
    return this.fb.group({
      full_name: ['', Validators.required],
      relationship: [''],
      birth_date: [''],
      schooling: [''],
    });
  }

  addDependent(): void {
    this.dependents.push(this.dependentGroup());
  }

  removeDependent(index: number): void {
    this.dependents.removeAt(index);
  }

  private educationGroup() {
    return this.fb.group({
      id: [null as number | null],
      education_level: [null as string | null],
      institution: [''],
      program: [''],
      graduation_year: [null as number | null],
      status: [null as string | null],
      certificate_url: [''],
    });
  }

  addEducation(): void {
    this.educationRows.push(this.educationGroup());
    this.educationCertFiles.push(null);
  }

  removeEducation(index: number): void {
    this.educationRows.removeAt(index);
    this.educationCertFiles.splice(index, 1);
  }

  private trainingGroup() {
    return this.fb.group({
      id: [null as number | null],
      name: ['', Validators.required],
      provider: [''],
      completed_at: [''],
      hours: [null as number | null],
      training_type: [null as string | null],
      certificate_url: [''],
    });
  }

  addTraining(): void {
    this.trainingRows.push(this.trainingGroup());
    this.trainingCertFiles.push(null);
  }

  removeTraining(index: number): void {
    this.trainingRows.removeAt(index);
    this.trainingCertFiles.splice(index, 1);
  }

  private priorJobGroup() {
    return this.fb.group({
      id: [null as number | null],
      company_name: ['', Validators.required],
      position: [''],
      start_date: [''],
      end_date: [''],
      duration_text: [''],
      economic_sector: [''],
      leave_reason: [''],
      reference_phone: [''],
    });
  }

  addPriorJob(): void {
    this.priorJobRows.push(this.priorJobGroup());
  }

  removePriorJob(index: number): void {
    this.priorJobRows.removeAt(index);
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  asControl(ctrl: AbstractControl): FormControl {
    return ctrl as FormControl;
  }

  onExtendedUpdated(p: EmployeeProfileFull): void {
    this.profile = p;
    this.patchForms(p);
  }

  private load(id: number): void {
    this.loading = true;
    this.api.get<EmployeeProfileFull>(`/employees/${id}/profile`).subscribe({
      next: (p) => {
        this.profile = p;
        this.canEdit = p.can_edit;
        this.canEditDocuments = p.can_edit_documents;
        this.canEditPayroll = p.can_edit_payroll;
        this.ageLabel = p.personal['age_years'] != null ? `${p.personal['age_years']} años` : '—';
        this.seniorityLabel = (p.labor['seniority_text'] as string) || '—';
        this.patchForms(p);
        if (!p.can_edit) {
          this.personalForm.disable();
          this.laborForm.disable();
          this.educationForm.disable();
          this.trainingForm.disable();
          this.priorJobsForm.disable();
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  private patchForms(p: EmployeeProfileFull): void {
    const per = p.personal;
    this.personalForm.patchValue({
      first_name: (per['first_name'] as string) ?? '',
      second_name: (per['second_name'] as string) ?? '',
      first_surname: (per['first_surname'] as string) ?? '',
      second_surname: (per['second_surname'] as string) ?? '',
      document_type: (per['document_type'] as string) ?? null,
      birth_date: this.isoDate(per['birth_date'] as string),
      gender: (per['gender'] as string) ?? null,
      marital_status: (per['marital_status'] as string) ?? null,
      children_count: (per['children_count'] as number) ?? null,
      residence_city: (per['residence_city'] as string) ?? '',
      residence_address: (per['residence_address'] as string) ?? '',
      neighborhood: (per['neighborhood'] as string) ?? '',
      phone: (per['phone'] as string) ?? '',
      personal_email: (per['personal_email'] as string) ?? '',
      corporate_email: (per['corporate_email'] as string) ?? '',
      blood_type: (per['blood_type'] as string) ?? '',
      rh_factor: (per['rh_factor'] as string) ?? '',
    });
    this.dependents.clear();
    for (const d of p.dependents) {
      this.dependents.push(
        this.fb.group({
          full_name: [d.full_name, Validators.required],
          relationship: [d.relationship ?? ''],
          birth_date: [this.isoDate(d.birth_date ?? undefined)],
          schooling: [d.schooling ?? ''],
        }),
      );
    }
    const lab = p.labor;
    this.laborForm.patchValue({
      linkage_type: (lab['linkage_type'] as string) ?? null,
      temp_agency_name: (lab['temp_agency_name'] as string) ?? '',
      work_site_city: (lab['work_site_city'] as string) ?? null,
      hierarchical_level: (lab['hierarchical_level'] as string) ?? null,
      hire_date: this.isoDate(lab['hire_date'] as string),
      contract_type: (lab['contract_type'] as string) ?? null,
      contract_end_date: this.isoDate(lab['contract_end_date'] as string),
      base_salary: lab['base_salary'] != null ? Number(lab['base_salary']) : null,
      work_schedule_type: (lab['work_schedule_type'] as string) ?? '',
      work_modality: (lab['work_modality'] as string) ?? null,
      eps_affiliation_number: (lab['eps_affiliation_number'] as string) ?? '',
      eps_name: (lab['eps_name'] as string) ?? '',
      pension_fund: (lab['pension_fund'] as string) ?? '',
      severance_fund: (lab['severance_fund'] as string) ?? '',
      family_compensation_box: (lab['family_compensation_box'] as string) ?? '',
      arl_name: (lab['arl_name'] as string) ?? '',
      arl_risk_level: (lab['arl_risk_level'] as string) ?? '',
      bank_name: (lab['bank_name'] as string) ?? '',
      bank_account_type: (lab['bank_account_type'] as string) ?? null,
      bank_account_number: (lab['bank_account_number'] as string) ?? '',
      collaborator_status: (lab['collaborator_status'] as string) ?? null,
      notes: (lab['notes'] as string) ?? '',
    });
    this.educationRows.clear();
    this.educationCertFiles = [];
    for (const e of p.education ?? []) {
      this.educationRows.push(
        this.fb.group({
          id: [e.id],
          education_level: [e.education_level ?? null],
          institution: [e.institution ?? ''],
          program: [e.program ?? ''],
          graduation_year: [e.graduation_year ?? null],
          status: [e.status ?? null],
          certificate_url: [e.certificate_url ?? ''],
        }),
      );
      this.educationCertFiles.push(null);
    }
    this.trainingRows.clear();
    this.trainingCertFiles = [];
    for (const t of p.training ?? []) {
      this.trainingRows.push(
        this.fb.group({
          id: [t.id],
          name: [t.name, Validators.required],
          provider: [t.provider ?? ''],
          completed_at: [this.isoDate(t.completed_at ?? undefined)],
          hours: [t.hours ?? null],
          training_type: [t.training_type ?? null],
          certificate_url: [t.certificate_url ?? ''],
        }),
      );
      this.trainingCertFiles.push(null);
    }
    this.priorJobRows.clear();
    for (const j of p.prior_jobs ?? []) {
      this.priorJobRows.push(
        this.fb.group({
          id: [j.id],
          company_name: [j.company_name, Validators.required],
          position: [j.position ?? ''],
          start_date: [this.isoDate(j.start_date ?? undefined)],
          end_date: [this.isoDate(j.end_date ?? undefined)],
          duration_text: [j.duration_text ?? ''],
          economic_sector: [j.economic_sector ?? ''],
          leave_reason: [j.leave_reason ?? ''],
          reference_phone: [j.reference_phone ?? ''],
        }),
      );
    }
  }

  private isoDate(val: string | undefined | null): string {
    if (!val) return '';
    return String(val).slice(0, 10);
  }

  private emptyToNull(v: string | null | undefined): string | null {
    const s = (v ?? '').trim();
    return s || null;
  }

  savePersonal(): void {
    if (!this.profile || !this.canEdit) return;
    this.saving = true;
    const v = this.personalForm.getRawValue();
    const body = {
      personal: {
        first_name: this.emptyToNull(v.first_name),
        second_name: this.emptyToNull(v.second_name),
        first_surname: this.emptyToNull(v.first_surname),
        second_surname: this.emptyToNull(v.second_surname),
        document_type: v.document_type,
        birth_date: this.emptyToNull(v.birth_date) || null,
        gender: v.gender,
        marital_status: v.marital_status,
        children_count: v.children_count,
        residence_city: this.emptyToNull(v.residence_city),
        residence_address: this.emptyToNull(v.residence_address),
        neighborhood: this.emptyToNull(v.neighborhood),
        phone: this.emptyToNull(v.phone),
        personal_email: this.emptyToNull(v.personal_email),
        corporate_email: this.emptyToNull(v.corporate_email),
        blood_type: this.emptyToNull(v.blood_type),
        rh_factor: this.emptyToNull(v.rh_factor),
        dependents: this.dependents.getRawValue().map((d) => ({
          full_name: d.full_name.trim(),
          relationship: this.emptyToNull(d.relationship),
          birth_date: this.emptyToNull(d.birth_date) || null,
          schooling: this.emptyToNull(d.schooling),
        })),
      },
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile`, body).subscribe({
      next: (p) => {
        this.profile = p;
        this.ageLabel = p.personal['age_years'] != null ? `${p.personal['age_years']} años` : '—';
        this.snack.open('Información personal guardada', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  saveLabor(): void {
    if (!this.profile || !this.canEdit) return;
    this.saving = true;
    const v = this.laborForm.getRawValue();
    const body = {
      labor: {
        linkage_type: v.linkage_type,
        temp_agency_name: this.emptyToNull(v.temp_agency_name),
        work_site_city: v.work_site_city,
        hierarchical_level: v.hierarchical_level,
        hire_date: this.emptyToNull(v.hire_date) || null,
        contract_type: v.contract_type,
        contract_end_date: this.emptyToNull(v.contract_end_date) || null,
        base_salary: v.base_salary,
        work_schedule_type: this.emptyToNull(v.work_schedule_type),
        work_modality: v.work_modality,
        eps_affiliation_number: this.emptyToNull(v.eps_affiliation_number),
        eps_name: this.emptyToNull(v.eps_name),
        pension_fund: this.emptyToNull(v.pension_fund),
        severance_fund: this.emptyToNull(v.severance_fund),
        family_compensation_box: this.emptyToNull(v.family_compensation_box),
        arl_name: this.emptyToNull(v.arl_name),
        arl_risk_level: this.emptyToNull(v.arl_risk_level),
        bank_name: this.emptyToNull(v.bank_name),
        bank_account_type: v.bank_account_type,
        bank_account_number: this.emptyToNull(v.bank_account_number),
        collaborator_status: v.collaborator_status,
        notes: this.emptyToNull(v.notes),
      },
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile`, body).subscribe({
      next: (p) => {
        this.profile = p;
        this.seniorityLabel = (p.labor['seniority_text'] as string) || '—';
        this.snack.open('Información laboral guardada', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  saveEducation(): void {
    if (!this.profile || !this.canEdit) return;
    this.saving = true;
    const body = {
      education: this.educationRows.getRawValue().map((r) => ({
        education_level: r.education_level,
        institution: this.emptyToNull(r.institution),
        program: this.emptyToNull(r.program),
        graduation_year: r.graduation_year,
        status: r.status,
        certificate_url: this.emptyToNull(r.certificate_url),
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile`, body).subscribe({
      next: (p) => {
        this.profile = p;
        this.patchForms(p);
        this.snack.open('Formación académica guardada', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  saveTraining(): void {
    if (!this.profile || !this.canEdit) return;
    this.saving = true;
    const body = {
      training: this.trainingRows.getRawValue().map((r) => ({
        name: r.name.trim(),
        provider: this.emptyToNull(r.provider),
        completed_at: this.emptyToNull(r.completed_at) || null,
        hours: r.hours,
        training_type: r.training_type,
        certificate_url: this.emptyToNull(r.certificate_url),
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile`, body).subscribe({
      next: (p) => {
        this.profile = p;
        this.patchForms(p);
        this.snack.open('Capacitaciones guardadas', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  savePriorJobs(): void {
    if (!this.profile || !this.canEdit) return;
    this.saving = true;
    const body = {
      prior_jobs: this.priorJobRows.getRawValue().map((r) => ({
        company_name: r.company_name.trim(),
        position: this.emptyToNull(r.position),
        start_date: this.emptyToNull(r.start_date) || null,
        end_date: this.emptyToNull(r.end_date) || null,
        economic_sector: this.emptyToNull(r.economic_sector),
        leave_reason: this.emptyToNull(r.leave_reason),
        reference_phone: this.emptyToNull(r.reference_phone),
      })),
    };
    this.api.patch<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile`, body).subscribe({
      next: (p) => {
        this.profile = p;
        this.patchForms(p);
        this.snack.open('Experiencia previa guardada', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  onEducationCertFile(index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.educationCertFiles[index] = input.files?.[0] ?? null;
  }

  onTrainingCertFile(index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.trainingCertFiles[index] = input.files?.[0] ?? null;
  }

  uploadEducationCertificate(index: number): void {
    if (!this.profile || !this.canEdit) return;
    const row = this.educationRows.at(index).getRawValue();
    const file = this.educationCertFiles[index];
    if (!row.id || !file) {
      this.snack.open('Guarde el registro y seleccione un archivo', 'Cerrar', { duration: 3500 });
      return;
    }
    this.uploadingCert = true;
    const fd = new FormData();
    fd.append('file', file);
    this.api
      .postFormData<EducationRow>(`/employees/${this.profile.employee.id}/education/${row.id}/certificate`, fd)
      .subscribe({
        next: (updated) => {
          this.educationRows.at(index).patchValue({ certificate_url: updated.certificate_url ?? '' });
          this.educationCertFiles[index] = null;
          this.snack.open('Certificado cargado', 'Cerrar', { duration: 3000 });
          this.uploadingCert = false;
        },
        error: () => {
          this.snack.open('No se pudo subir el certificado', 'Cerrar', { duration: 4000 });
          this.uploadingCert = false;
        },
      });
  }

  uploadTrainingCertificate(index: number): void {
    if (!this.profile || !this.canEdit) return;
    const row = this.trainingRows.at(index).getRawValue();
    const file = this.trainingCertFiles[index];
    if (!row.id || !file) {
      this.snack.open('Guarde el registro y seleccione un archivo', 'Cerrar', { duration: 3500 });
      return;
    }
    this.uploadingCert = true;
    const fd = new FormData();
    fd.append('file', file);
    this.api
      .postFormData<TrainingRow>(`/employees/${this.profile.employee.id}/training/${row.id}/certificate`, fd)
      .subscribe({
        next: (updated) => {
          this.trainingRows.at(index).patchValue({ certificate_url: updated.certificate_url ?? '' });
          this.trainingCertFiles[index] = null;
          this.snack.open('Certificado cargado', 'Cerrar', { duration: 3000 });
          this.uploadingCert = false;
        },
        error: () => {
          this.snack.open('No se pudo subir el certificado', 'Cerrar', { duration: 4000 });
          this.uploadingCert = false;
        },
      });
  }

  get photoPreviewUrl(): string {
    const url = this.profile?.personal['photo_url'] as string | undefined;
    return url ? publicAssetUrl(url) : '';
  }

  assetUrl(path: string): string {
    return publicAssetUrl(path);
  }

  onPhotoFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.selectedPhotoFile = input.files?.[0] ?? null;
  }

  uploadPhoto(): void {
    if (!this.profile || !this.selectedPhotoFile || !this.canEdit) return;
    this.uploadingPhoto = true;
    const fd = new FormData();
    fd.append('file', this.selectedPhotoFile);
    this.api
      .postFormData<EmployeeProfileFull>(`/employees/${this.profile.employee.id}/profile/photo`, fd)
      .subscribe({
        next: (p) => {
          this.profile = p;
          this.patchForms(p);
          this.selectedPhotoFile = null;
          this.snack.open('Foto guardada', 'Cerrar', { duration: 3000 });
          this.uploadingPhoto = false;
        },
        error: () => {
          this.snack.open('No se pudo subir la foto. Verifique S3 o intente de nuevo.', 'Cerrar', {
            duration: 5000,
          });
          this.uploadingPhoto = false;
        },
      });
  }

  onDocFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadDocument(): void {
    if (!this.profile || !this.selectedFile || !this.canEditDocuments) return;
    this.uploading = true;
    const v = this.uploadForm.getRawValue();
    const fd = new FormData();
    fd.append('file', this.selectedFile);
    fd.append('document_kind', v.document_kind ?? 'otro');
    if (v.display_name?.trim()) {
      fd.append('display_name', v.display_name.trim());
    }
    fd.append('status', v.status ?? 'vigente');
    if (v.expires_at) {
      fd.append('expires_at', v.expires_at);
    }
    this.api.postFormData<EmployeeDocumentRow>(`/employees/${this.profile.employee.id}/documents`, fd).subscribe({
        next: () => {
          this.selectedFile = null;
          this.uploadForm.patchValue({ display_name: '', expires_at: '' });
          this.snack.open('Documento cargado', 'Cerrar', { duration: 3000 });
          this.load(this.profile!.employee.id);
          this.uploading = false;
        },
        error: () => {
          this.snack.open('No se pudo subir el documento', 'Cerrar', { duration: 4000 });
          this.uploading = false;
        },
      });
  }

  deleteDocument(d: EmployeeDocumentRow): void {
    if (!this.profile || !confirm(`¿Eliminar «${d.display_name}»?`)) return;
    this.api.delete(`/employees/${this.profile.employee.id}/documents/${d.id}`).subscribe({
      next: () => {
        this.snack.open('Documento eliminado', 'Cerrar', { duration: 3000 });
        this.load(this.profile!.employee.id);
      },
      error: () => this.snack.open('No se pudo eliminar', 'Cerrar', { duration: 4000 }),
    });
  }
}
