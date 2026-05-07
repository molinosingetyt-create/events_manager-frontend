import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import type { ProfileRow } from './settings-profile.model';

interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  sort_order: number;
}

const BEHAVIOR_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador (ámbito global)' },
  { value: 'HR', label: 'Recursos humanos' },
  { value: 'MANAGEMENT', label: 'Gerencia' },
  { value: 'LEADER', label: 'Líder (área)' },
];

@Component({
  selector: 'em-settings-profile-wizard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatStepperModule,
    MatTooltipModule,
  ],
  template: `
    <div class="wizard-page">
      <nav class="back-nav">
        <a mat-button [routerLink]="rbacListPath" class="back-link">
          <mat-icon>arrow_back</mat-icon>
          Volver a perfiles
        </a>
      </nav>

      <div class="page-head">
        <h1>{{ wizardMode === 'create' ? 'Nuevo perfil' : 'Editar perfil' }}</h1>
        <p class="page-lead">
          Paso 1: datos del perfil. Paso 2: permisos que tendrá asignados.
        </p>
      </div>

      @if (loadError) {
        <p class="error-msg">No se pudo cargar el perfil.</p>
        <a mat-button [routerLink]="rbacListPath">Volver</a>
      } @else if (wizardMode === 'edit' && loadingProfile) {
        <p class="muted">Cargando perfil…</p>
      } @else {
        <mat-stepper [linear]="true" orientation="horizontal" class="stepper">
          <mat-step [stepControl]="form" label="Datos del perfil">
            <form [formGroup]="form" class="form">
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Código</mat-label>
                  <input matInput formControlName="code" placeholder="EJEMPLO_PERFIL" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="grow">
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Descripción</mat-label>
                <input matInput formControlName="description" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Comportamiento (ámbito)</mat-label>
                <mat-select formControlName="behavior_key">
                  @for (b of behaviorOptions; track b.value) {
                    <mat-option [value]="b.value">{{ b.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </form>
            <div class="step-actions">
              <button mat-button type="button" [routerLink]="rbacListPath">Cancelar</button>
              <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="form.invalid">
                Siguiente
              </button>
            </div>
          </mat-step>

          <mat-step label="Permisos">
            <p class="hint">
              Marca los permisos que tendrá este perfil. Los nombres coinciden con el catálogo del sistema.
            </p>
            @if (loadingPerms) {
              <p class="muted">Cargando lista de permisos…</p>
            } @else {
              <div class="perm-grid">
                @for (p of permissionList; track p.id) {
                  <mat-checkbox
                    [checked]="selectedPermIds.has(p.id)"
                    (change)="togglePerm(p.id, $event.checked)"
                    [matTooltip]="'Código: ' + p.code"
                    matTooltipPosition="above"
                  >
                    {{ p.name }}
                  </mat-checkbox>
                }
              </div>
            }
            <div class="step-actions">
              <button mat-button type="button" matStepperPrevious>Atrás</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="save()"
                [disabled]="saving || loadingPerms"
              >
                @if (saving) {
                  Guardando…
                } @else {
                  Guardar perfil
                }
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      }
    </div>
  `,
  styles: `
    .wizard-page {
      max-width: 720px;
    }
    .back-nav {
      margin-bottom: 0.5rem;
    }
    .back-link {
      padding-left: 0;
    }
    .stepper {
      background: #fff;
      border-radius: 12px;
      border: 1px solid var(--em-border, #FCEDD9);
      padding: 1rem 1rem 1.25rem;
      margin-top: 0.5rem;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 0.75rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .grow {
      flex: 1;
      min-width: 180px;
    }
    .full {
      width: 100%;
    }
    .hint {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      color: #103847;
      line-height: 1.45;
    }
    .perm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.35rem 0.75rem;
      max-height: min(50vh, 420px);
      overflow-y: auto;
      padding: 0.25rem 0.25rem 0.75rem 0;
      margin-bottom: 0.5rem;
    }
    .step-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--em-border, #FCEDD9);
    }
    .muted {
      color: #103847;
    }
    .error-msg {
      color: #C7272D;
    }
    mat-checkbox {
      align-items: flex-start;
      white-space: normal;
      height: auto;
    }
  `,
})
export class SettingsProfileWizardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * Ruta absoluta a la lista RBAC. `routerLink=".."` en componentes hijos del layout de seguridad
   * puede resolverse mal y mandar a `/` → wildcard → login.
   */
  readonly rbacListPath = ['/app', 'configuracion', 'seguridad'];

  readonly behaviorOptions = BEHAVIOR_OPTIONS;

  wizardMode: 'create' | 'edit' = 'create';
  loadingProfile = false;
  loadError = false;

  permissionList: PermissionRow[] = [];
  loadingPerms = true;
  saving = false;
  selectedPermIds = new Set<number>();

  private editProfileId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    name: ['', Validators.required],
    description: [''],
    behavior_key: ['LEADER', Validators.required],
  });

  ngOnInit(): void {
    const mode = this.route.snapshot.data['profileWizardMode'] as 'create' | 'edit' | undefined;
    const pid = this.route.snapshot.paramMap.get('profileId');
    this.wizardMode = mode === 'edit' ? 'edit' : 'create';

    if (this.wizardMode === 'edit' && pid) {
      this.editProfileId = Number(pid);
      this.loadingProfile = true;
      this.api.get<ProfileRow>(`/security/profiles/${this.editProfileId}`).subscribe({
        next: (p) => {
          this.form.patchValue({
            code: p.code,
            name: p.name,
            description: p.description ?? '',
            behavior_key: p.behavior_key,
          });
          this.form.get('code')?.disable();
          this.selectedPermIds = new Set(p.permission_ids || []);
          this.loadingProfile = false;
        },
        error: () => {
          this.loadingProfile = false;
          this.loadError = true;
        },
      });
    } else {
      this.form.get('code')?.enable();
    }

    this.api.get<PermissionRow[]>('/security/permissions').subscribe({
      next: (list) => {
        this.permissionList = list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        this.loadingPerms = false;
      },
      error: () => (this.loadingPerms = false),
    });
  }

  togglePerm(id: number, checked: boolean): void {
    if (checked) {
      this.selectedPermIds.add(id);
    } else {
      this.selectedPermIds.delete(id);
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const permission_ids = [...this.selectedPermIds];
    this.saving = true;

    if (this.wizardMode === 'create') {
      this.api
        .post<ProfileRow>('/security/profiles', {
          code: raw.code,
          name: raw.name,
          description: raw.description || null,
          behavior_key: raw.behavior_key,
          permission_ids,
        })
        .subscribe({
          next: () => {
            this.saving = false;
            void this.router.navigate(this.rbacListPath);
          },
          error: () => (this.saving = false),
        });
      return;
    }

    const id = this.editProfileId!;
    this.api
      .patch<ProfileRow>(`/security/profiles/${id}`, {
        name: raw.name,
        description: raw.description || null,
        behavior_key: raw.behavior_key,
      })
      .subscribe({
        next: () => {
          this.api.put<ProfileRow>(`/security/profiles/${id}/permissions`, { permission_ids }).subscribe({
            next: () => {
              this.saving = false;
              void this.router.navigate(this.rbacListPath);
            },
            error: () => (this.saving = false),
          });
        },
        error: () => (this.saving = false),
      });
  }
}
