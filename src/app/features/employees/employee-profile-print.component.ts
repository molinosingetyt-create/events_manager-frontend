import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { publicAssetUrl } from '../../core/utils/public-asset-url';
import { AuthService } from '../../core/services/auth.service';
import type { EmployeeProfileFull } from './employee-profile.types';

@Component({
  selector: 'em-employee-profile-print',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="toolbar no-print">
      <a mat-stroked-button [routerLink]="['/app/employees', employeeId, 'expediente']">
        <mat-icon>arrow_back</mat-icon>
        Volver al expediente
      </a>
      <button mat-flat-button color="primary" type="button" (click)="print()">
        <mat-icon>picture_as_pdf</mat-icon>
        Imprimir / guardar PDF
      </button>
    </div>
    @if (loading) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (!profile) {
      <p>No se pudo cargar el expediente.</p>
    } @else {
      <article class="print-doc">
        <header class="doc-header">
          @if (photoUrl()) {
            <img class="doc-photo" [src]="photoUrl()" alt="Foto del colaborador" />
          }
          <div class="doc-header-text">
            <h1>Hoja de vida institucional</h1>
            <p class="org">Molinos del Atlántico</p>
            <p class="gen">Generado: {{ now | date: 'medium' }}</p>
          </div>
        </header>

        <section>
          <h2>Datos generales</h2>
          <table class="kv">
            <tr><th>Nombre</th><td>{{ fullName() }}</td></tr>
            <tr><th>Documento</th><td>{{ profile.employee.identification_number }}</td></tr>
            <tr><th>Cargo</th><td>{{ profile.employee.position }}</td></tr>
            <tr><th>Área</th><td>{{ profile.employee.area_name }}</td></tr>
            <tr><th>Temporal</th><td>{{ temporalName() }}</td></tr>
            <tr><th>Líder</th><td>{{ profile.employee.leader_name || '—' }}</td></tr>
            <tr><th>Completitud expediente</th><td>{{ profile.completeness_percent }}%</td></tr>
          </table>
        </section>

        <section>
          <h2>Información personal</h2>
          <table class="kv">
            <tr><th>Nombres</th><td>{{ fullName() }}</td></tr>
            <tr><th>Nacimiento</th><td>{{ fmt(profile.personal['birth_date']) }}</td></tr>
            <tr><th>Edad</th><td>{{ profile.personal['age_years'] ?? '—' }}</td></tr>
            <tr><th>Teléfono</th><td>{{ profile.personal['phone'] || '—' }}</td></tr>
            <tr><th>Correo corporativo</th><td>{{ profile.personal['corporate_email'] || '—' }}</td></tr>
            <tr><th>Correo personal</th><td>{{ profile.personal['personal_email'] || '—' }}</td></tr>
            <tr><th>Residencia</th><td>{{ profile.personal['residence_city'] || '—' }}</td></tr>
            <tr><th>Dirección</th><td>{{ profile.personal['residence_address'] || '—' }}</td></tr>
            <tr><th>Grupo sanguíneo</th><td>{{ bloodTypeLabel() }}</td></tr>
          </table>
        </section>

        <section>
          <h2>Información laboral</h2>
          <table class="kv">
            <tr><th>Vinculación</th><td>{{ profile.labor['linkage_type'] || '—' }}</td></tr>
            <tr><th>Empresa temporal</th><td>{{ profile.labor['temp_agency_name'] || temporalName() || '—' }}</td></tr>
            <tr><th>Sede</th><td>{{ profile.labor['work_site_city'] || '—' }}</td></tr>
            <tr><th>Nivel jerárquico</th><td>{{ profile.labor['hierarchical_level'] || '—' }}</td></tr>
            <tr><th>Ingreso</th><td>{{ fmt(profile.labor['hire_date']) }}</td></tr>
            <tr><th>Antigüedad</th><td>{{ profile.labor['seniority_text'] || '—' }}</td></tr>
            <tr><th>Contrato</th><td>{{ profile.labor['contract_type'] || '—' }}</td></tr>
            <tr><th>Vence contrato</th><td>{{ fmt(profile.labor['contract_end_date']) }}</td></tr>
            <tr><th>EPS</th><td>{{ profile.labor['eps_name'] || '—' }}</td></tr>
            <tr><th>ARL</th><td>{{ profile.labor['arl_name'] || '—' }}</td></tr>
          </table>
        </section>

        @if (profile.education.length) {
          <section>
            <h2>Formación académica</h2>
            <table class="data">
              <thead>
                <tr><th>Nivel</th><th>Institución</th><th>Programa</th><th>Año</th></tr>
              </thead>
              <tbody>
                @for (e of profile.education; track e.id) {
                  <tr>
                    <td>{{ e.education_level || '—' }}</td>
                    <td>{{ e.institution || '—' }}</td>
                    <td>{{ e.program || '—' }}</td>
                    <td>{{ e.graduation_year ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        @if (profile.training.length) {
          <section>
            <h2>Capacitaciones</h2>
            <table class="data">
              <thead>
                <tr><th>Nombre</th><th>Proveedor</th><th>Fecha</th><th>Horas</th></tr>
              </thead>
              <tbody>
                @for (t of profile.training; track t.id) {
                  <tr>
                    <td>{{ t.name }}</td>
                    <td>{{ t.provider || '—' }}</td>
                    <td>{{ fmt(t.completed_at) }}</td>
                    <td>{{ t.hours ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        @if (profile.documents.length) {
          <section>
            <h2>Documentos cargados</h2>
            <table class="data">
              <thead>
                <tr><th>Documento</th><th>Tipo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                @for (d of profile.documents; track d.id) {
                  <tr>
                    <td>{{ d.display_name }}</td>
                    <td>{{ d.document_kind_label }}</td>
                    <td>{{ d.status }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      </article>
    }
  `,
  styles: `
    .toolbar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .print-doc {
      max-width: 900px;
      margin: 0 auto;
      padding: 1.5rem;
      font-family: system-ui, sans-serif;
      font-size: 11pt;
      color: #111;
    }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 1rem;
    }
    .doc-header-text {
      text-align: center;
    }
    .doc-photo {
      width: 110px;
      height: 110px;
      border-radius: 8px;
      object-fit: cover;
      border: 2px solid #0066cc;
    }
    .doc-header h1 {
      margin: 0;
      font-size: 1.35rem;
    }
    .org {
      margin: 0.25rem 0 0;
      font-weight: 600;
    }
    .gen {
      margin: 0.35rem 0 0;
      font-size: 0.8rem;
      color: #555;
    }
    section {
      margin-bottom: 1.25rem;
      page-break-inside: avoid;
    }
    h2 {
      font-size: 1rem;
      margin: 0 0 0.5rem;
      color: #103847;
    }
    table.kv {
      width: 100%;
      border-collapse: collapse;
    }
    table.kv th {
      text-align: left;
      width: 32%;
      padding: 0.25rem 0.5rem 0.25rem 0;
      vertical-align: top;
      font-weight: 600;
    }
    table.kv td {
      padding: 0.25rem 0;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    table.data th,
    table.data td {
      border: 1px solid #ccc;
      padding: 0.35rem 0.5rem;
      text-align: left;
    }
    table.data th {
      background: #f0f4f8;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      .print-doc {
        padding: 0;
      }
    }
  `,
})
export class EmployeeProfilePrintComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  employeeId = 0;
  profile: EmployeeProfileFull | null = null;
  loading = true;
  now = new Date();

  ngOnInit(): void {
    if (!this.auth.hasPermission('employees.profile.export')) {
      this.loading = false;
      return;
    }
    this.employeeId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.employeeId) {
      this.loading = false;
      return;
    }
    this.api.get<EmployeeProfileFull>(`/employees/${this.employeeId}/profile`).subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  fullName(): string {
    if (!this.profile) return '—';
    const p = this.profile.personal;
    const parts = [p['first_name'], p['second_name'], p['first_surname'], p['second_surname']]
      .filter((x) => x && String(x).trim())
      .join(' ');
    return parts || this.profile.employee.name;
  }

  temporalName(): string {
    const emp = this.profile?.employee as { temporal_category_name?: string } | undefined;
    return emp?.temporal_category_name?.trim() || '—';
  }

  photoUrl(): string {
    const raw = this.profile?.personal['photo_url'] as string | undefined;
    return raw ? publicAssetUrl(raw) : '';
  }

  bloodTypeLabel(): string {
    if (!this.profile) return '—';
    const bt = this.profile.personal['blood_type'] as string | undefined;
    const rh = this.profile.personal['rh_factor'] as string | undefined;
    if (!bt && !rh) return '—';
    return [bt, rh].filter(Boolean).join(' ');
  }

  fmt(v: unknown): string {
    if (!v) return '—';
    return String(v).slice(0, 10);
  }

  print(): void {
    window.print();
  }
}
