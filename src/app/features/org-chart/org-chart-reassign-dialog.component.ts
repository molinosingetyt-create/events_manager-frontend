import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import type { OrgChartReassignTarget } from './org-chart.types';

interface LeaderUser {
  id: number;
  name: string;
}

interface EmployeeRead {
  leader_id: number | null;
}

interface UserRead {
  leader_id?: number | null;
}

@Component({
  selector: 'em-org-chart-reassign-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Cambiar líder</h2>
      <mat-dialog-content>
        @if (loadError) {
          <p>No se pudo cargar la información.</p>
        } @else if (!loaded) {
          <div class="loading"><mat-spinner diameter="40" /></div>
        } @else {
          <p class="hint">
            <strong>{{ data.name }}</strong> — {{ data.kind === 'user' ? 'usuario líder' : 'empleado' }}
          </p>
          @if (data.kind === 'user') {
            <p class="note">
              Solo cambia a quién reporta esta persona en el organigrama. Los colaboradores que ya la tienen
              como líder en Empleados no se modifican.
            </p>
          }
          <form [formGroup]="form" class="form">
            <em-searchable-select
              label="Nuevo líder"
              placeholder="Seleccione un líder"
              [control]="form.controls.leader_id"
              [options]="leaderOptions"
              [allowNull]="true"
              nullLabel="Sin líder asignado"
            />
          </form>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="!loaded || loadError || form.invalid || loading"
        >
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Guardar
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .hint {
      margin: 0 0 0.75rem;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .note {
      margin: 0 0 1rem;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      background: #f0f7ff;
      border: 1px solid rgba(0, 102, 204, 0.2);
      font-size: 0.82rem;
      line-height: 1.45;
      color: #103847;
    }
    .form {
      min-width: min(100%, 380px);
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 1.5rem;
    }
  `,
})
export class OrgChartReassignDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<OrgChartReassignDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as OrgChartReassignTarget;

  leaderOptions: SearchableOption<number>[] = [];
  loaded = false;
  loadError = false;
  loading = false;

  readonly form = this.fb.group({
    leader_id: [null as number | null],
  });

  ngOnInit(): void {
    const leaderReq = this.api.getAllPages<LeaderUser>('/users', { role: 'LEADER' });
    const detailReq =
      this.data.kind === 'employee' && this.data.employeeId != null
        ? this.api.get<EmployeeRead>(`/employees/${this.data.employeeId}`)
        : this.data.kind === 'user' && this.data.userId != null
          ? this.api.get<UserRead>(`/users/${this.data.userId}`)
          : null;

    if (!detailReq) {
      this.loadError = true;
      return;
    }

    forkJoin({ leaders: leaderReq, detail: detailReq }).subscribe({
      next: ({ leaders, detail }) => {
        this.leaderOptions = leaders.map((u) => ({ value: u.id, label: u.name }));
        const lid =
          this.data.kind === 'employee'
            ? (detail as EmployeeRead).leader_id
            : ((detail as UserRead).leader_id ?? null);
        this.form.patchValue({ leader_id: lid != null && lid > 0 ? lid : null });
        this.loaded = true;
      },
      error: () => {
        this.loadError = true;
      },
    });
  }

  submit(): void {
    if (this.form.invalid || !this.loaded) {
      return;
    }
    const lid = this.form.controls.leader_id.value;
    const leaderId = lid != null && lid > 0 ? lid : null;
    this.loading = true;

    if (this.data.kind === 'employee' && this.data.employeeId != null) {
      this.api.patch(`/employees/${this.data.employeeId}`, { leader_id: leaderId }).subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
      return;
    }

    if (this.data.kind === 'user' && this.data.userId != null) {
      this.api.patch(`/users/${this.data.userId}`, { leader_id: leaderId }).subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
      return;
    }

    this.loading = false;
  }
}
