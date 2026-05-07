import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { maxLocalDate, todayLocal } from '../../core/utils/date-api';

/**
 * Campo de fecha con calendario Material: al abrir muestra el mes de `startAt` o,
 * si no se indica, el de la fecha elegida o **hoy**.
 */
@Component({
  selector: 'em-date-field',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <mat-form-field appearance="outline" class="full">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="control"
        [min]="min"
        [max]="max"
        [matDatepickerFilter]="filterFn"
        (click)="picker.open()"
        readonly
      />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker [startAt]="panelStart" />
    </mat-form-field>
  `,
  styles: `
    .full {
      width: 100%;
    }
    input[readonly] {
      cursor: pointer;
    }
  `,
})
export class DateFieldComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<Date | null>;
  /** Fecha mínima seleccionable (inclusive). */
  @Input() min: Date | null = null;
  /** Fecha máxima seleccionable (inclusive). */
  @Input() max: Date | null = null;
  /**
   * Mes inicial del panel al abrir (si no hay valor). Por defecto: hoy.
   * Si hay `min` y es posterior a hoy, se usa `max(hoy, min)` para que el mes sea útil.
   */
  @Input() startAt: Date | null = null;
  /** Filtro opcional (además de min/max). */
  @Input() dateFilter: ((d: Date | null) => boolean) | null = null;

  readonly filterFn = (d: Date | null): boolean => {
    if (d == null) {
      return true;
    }
    if (this.dateFilter && !this.dateFilter(d)) {
      return false;
    }
    return true;
  };

  get panelStart(): Date {
    if (this.startAt) {
      return this.startAt;
    }
    const v = this.control.value;
    if (v) {
      return v;
    }
    const t = todayLocal();
    if (this.min && this.min.getTime() > t.getTime()) {
      return maxLocalDate(t, this.min);
    }
    return t;
  }
}
