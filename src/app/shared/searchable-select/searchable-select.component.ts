import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SearchableOption<T> {
  value: T;
  label: string;
}

/**
 * `mat-select` con campo de búsqueda (ngx-mat-select-search).
 * Valores primitivos: string | number; opcional `null` para “sin valor”.
 */
@Component({
  selector: 'em-searchable-select',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    NgxMatSelectSearchModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full">
      <mat-label>{{ label }}</mat-label>
      <mat-select [formControl]="control" [placeholder]="placeholder" [compareWith]="compareWith">
        <mat-option>
          <ngx-mat-select-search
            [formControl]="filterCtrl"
            placeholderLabel="Buscar…"
            noEntriesFoundLabel="Sin coincidencias"
          />
        </mat-option>
        @if (allowNull) {
          <mat-option [value]="null">{{ nullLabel }}</mat-option>
        }
        @for (opt of filteredOptions; track opt.value) {
          <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `:host {
      display: block;
      width: 100%;
    }`,
    `.full {
      width: 100%;
    }`,
  ],
})
export class SearchableSelectComponent<T extends string | number> implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<T | null>;
  @Input({ required: true }) options!: SearchableOption<T>[];
  @Input() placeholder = '';
  @Input() allowNull = false;
  @Input() nullLabel = '—';

  filterCtrl = new FormControl<string>('', { nonNullable: true });
  filteredOptions: SearchableOption<T>[] = [];
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.filterCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilter());
    this.applyFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.applyFilter();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  compareWith = (a: T | null | undefined, b: T | null | undefined): boolean => {
    if (a === null || a === undefined) {
      return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
      return false;
    }
    return a === b;
  };

  private applyFilter(): void {
    const q = (this.filterCtrl.value || '').toLowerCase().trim();
    const src = this.options ?? [];
    if (!q) {
      this.filteredOptions = [...src];
      return;
    }
    this.filteredOptions = src.filter((o) => o.label.toLowerCase().includes(q));
  }
}
