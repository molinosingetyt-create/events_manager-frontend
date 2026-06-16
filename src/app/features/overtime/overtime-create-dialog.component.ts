import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, map, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { dateToYmd } from '../../core/utils/date-api';
import { DateFieldComponent } from '../../shared/date-field/date-field.component';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';

interface EmployeeOpt {
  id: number;
  name: string;
  leader_id: number | null;
}

interface LeaderOption {
  id: number;
  name: string;
}

interface OvertimeBatchCreateResponse {
  items: unknown[];
  hours_per_day: string;
  total_hours: string;
}

@Component({
  selector: 'em-overtime-create-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    SearchableSelectComponent,
    DateFieldComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Nueva solicitud de horas extra</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="form">
          <em-searchable-select
            label="Empleado"
            placeholder="Seleccione un empleado"
            [control]="form.controls.employee_id"
            [options]="employeeOptions"
          />

          <div class="time-row">
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Desde</mat-label>
              <input matInput type="time" formControlName="start_time" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Hasta</mat-label>
              <input matInput type="time" formControlName="end_time" />
            </mat-form-field>
          </div>

          @if (hoursPerDay() > 0) {
            <p class="hours-summary">
              <strong>{{ hoursPerDay() | number: '1.0-2' }} h</strong> por día
              ({{ timeRangeLabel() }})
              @if (selectedDates.length > 0) {
                · Total: <strong>{{ totalHours() | number: '1.0-2' }} h</strong> en
                {{ selectedDates.length }} día{{ selectedDates.length === 1 ? '' : 's' }}
              }
            </p>
          } @else if (form.controls.end_time.touched || form.controls.start_time.touched) {
            <p class="hours-error">La hora de fin debe ser posterior a la de inicio.</p>
          }

          <div class="dates-block">
            <div class="dates-picker">
              <em-date-field label="Agregar fecha" [control]="datePicker" />
              <button
                mat-stroked-button
                type="button"
                (click)="addDate()"
                [disabled]="!datePicker.value"
              >
                <mat-icon>event_available</mat-icon>
                Agregar día
              </button>
            </div>
            @if (selectedDates.length) {
              <div class="date-chips" aria-label="Días seleccionados">
                @for (d of selectedDates; track d) {
                  <button type="button" class="date-chip" (click)="removeDate(d)">
                    {{ d }}
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            } @else {
              <p class="dates-hint">Seleccione uno o más días con la misma franja horaria.</p>
            }
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Justificación</mat-label>
            <textarea matInput rows="3" formControlName="justification"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-button type="button" (click)="ref.close(false)" [disabled]="loading">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="!canSubmit() || loading"
        >
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Crear {{ selectedDates.length > 1 ? selectedDates.length + ' solicitudes' : 'solicitud' }}
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      min-width: min(100%, 460px);
      padding-top: 0.5rem;
      gap: 0.15rem;
    }
    .full {
      width: 100%;
    }
    .time-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .time-field {
      width: 100%;
    }
    .hours-summary {
      margin: 0.25rem 0 0.5rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.85rem;
      background: rgba(0, 102, 204, 0.06);
      border-radius: 8px;
      border: 1px solid rgba(0, 102, 204, 0.15);
    }
    .hours-error {
      margin: 0.25rem 0 0.5rem;
      font-size: 0.82rem;
      color: #b00020;
    }
    .dates-block {
      margin: 0.35rem 0 0.5rem;
    }
    .dates-picker {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .dates-picker em-date-field {
      flex: 1 1 200px;
    }
    .date-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.65rem;
    }
    .date-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      border: 1px solid rgba(0, 102, 204, 0.25);
      background: rgba(0, 102, 204, 0.08);
      font-size: 0.8rem;
      cursor: pointer;
      color: inherit;
    }
    .date-chip mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.7;
    }
    .dates-hint {
      margin: 0.5rem 0 0;
      font-size: 0.8rem;
      color: rgba(10, 10, 10, 0.55);
    }
  `,
})
export class OvertimeCreateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly ref = inject(MatDialogRef<OvertimeCreateDialogComponent>);

  employeeOptions: SearchableOption<number>[] = [];
  loading = false;
  selectedDates: string[] = [];
  readonly datePicker = this.fb.control<Date | null>(null);

  readonly form = this.fb.group({
    employee_id: [null as number | null, Validators.required],
    start_time: ['15:00', Validators.required],
    end_time: ['17:00', Validators.required],
    justification: ['', Validators.required],
  });

  ngOnInit(): void {
    this.resolveLeaderIdsForCurrentUser().subscribe((leaderIds) => {
      const params: Record<string, string | number> = {};
      if (leaderIds?.length === 1) {
        params['leader_id'] = leaderIds[0];
      }
      this.api
        .getAllPages<EmployeeOpt & { identification_number?: string }>('/employees', params)
        .subscribe((items) => {
          const scoped =
            leaderIds?.length ? items.filter((e) => e.leader_id != null && leaderIds.includes(e.leader_id)) : items;
          this.employeeOptions = scoped.map((x) => ({ value: x.id, label: x.name }));
        });
    });
  }

  hoursPerDay(): number {
    return this.calcHours(this.form.controls.start_time.value, this.form.controls.end_time.value);
  }

  totalHours(): number {
    return this.hoursPerDay() * this.selectedDates.length;
  }

  timeRangeLabel(): string {
    const start = this.form.controls.start_time.value;
    const end = this.form.controls.end_time.value;
    if (!start || !end) return '—';
    return `${this.formatTime12h(start)} – ${this.formatTime12h(end)}`;
  }

  canSubmit(): boolean {
    return (
      this.form.valid &&
      this.selectedDates.length > 0 &&
      this.hoursPerDay() > 0
    );
  }

  addDate(): void {
    const d = this.datePicker.value;
    if (!d) return;
    const ymd = dateToYmd(d);
    if (!this.selectedDates.includes(ymd)) {
      this.selectedDates = [...this.selectedDates, ymd].sort();
    }
    this.datePicker.setValue(null);
  }

  removeDate(ymd: string): void {
    this.selectedDates = this.selectedDates.filter((x) => x !== ymd);
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const v = this.form.getRawValue();
    if (v.employee_id == null) return;
    this.loading = true;
    this.api
      .post<OvertimeBatchCreateResponse>('/overtime-requests', {
        employee_id: v.employee_id,
        dates: this.selectedDates,
        start_time: v.start_time,
        end_time: v.end_time,
        justification: v.justification,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => (this.loading = false),
        complete: () => (this.loading = false),
      });
  }

  private calcHours(start: string | null, end: string | null): number {
    if (!start || !end) return 0;
    const sm = this.toMinutes(start);
    const em = this.toMinutes(end);
    if (em <= sm) return 0;
    return Math.round(((em - sm) / 60) * 100) / 100;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    return (h || 0) * 60 + (m || 0);
  }

  private formatTime12h(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12 || 12;
    return m ? `${h}:${m.toString().padStart(2, '0')} ${period}` : `${h} ${period}`;
  }

  private resolveLeaderIdsForCurrentUser(): Observable<number[] | null> {
    if (this.auth.hasRole('ADMIN')) {
      return of(null);
    }
    const u = this.auth.user();
    if (!u) {
      return of(null);
    }
    if (this.auth.hasRole('LEADER')) {
      return of([u.id]);
    }
    if (u.leader_id != null && u.leader_id > 0) {
      return of([u.leader_id]);
    }
    return this.api.get<LeaderOption[]>('/incapacity-notes/leader-filter-options').pipe(
      map((opts) => {
        const ids = (opts ?? []).map((o) => o.id).filter((id) => id > 0);
        return ids.length ? ids : null;
      }),
    );
  }
}
