import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import {
  SearchableSelectComponent,
  type SearchableOption,
} from '../../shared/searchable-select/searchable-select.component';
import type { OrgChartManualLeadersDialogData } from './org-chart.types';

@Component({
  selector: 'em-org-chart-manual-leaders-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SearchableSelectComponent,
  ],
  template: `
    <div class="em-dialog">
      <h2 mat-dialog-title>Líderes en el organigrama</h2>
      <mat-dialog-content>
        <p class="hint">
          <strong>{{ data.name }}</strong> puede reportar a varias personas. No modifica el módulo Empleados.
        </p>
        @if (parentIds.length) {
          <div class="chips">
            @for (pid of parentIds; track pid) {
              <span class="chip">
                {{ labelOf(pid) }}
                <button type="button" mat-icon-button aria-label="Quitar líder" (click)="removeParent(pid)">
                  <mat-icon>close</mat-icon>
                </button>
              </span>
            }
          </div>
        } @else {
          <p class="empty">Sin líderes asignados (aparece en la cima del diagrama).</p>
        }
        <form [formGroup]="form" class="form">
          <em-searchable-select
            label="Agregar líder"
            placeholder="Seleccione persona"
            [control]="form.controls.add_parent_id"
            [options]="addOptions"
            [allowNull]="true"
            nullLabel="—"
          />
          <button
            mat-stroked-button
            type="button"
            class="add-btn"
            (click)="addParent()"
            [disabled]="!form.controls.add_parent_id.value || loading"
          >
            Agregar relación
          </button>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button color="primary" type="button" (click)="ref.close(true)">Listo</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .hint {
      margin: 0 0 1rem;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .empty {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      color: #666;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.25rem 0.35rem 0.25rem 0.65rem;
      border-radius: 999px;
      background: #e8f2fc;
      font-size: 0.82rem;
    }
    .chip mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .form {
      min-width: min(100%, 380px);
    }
    .add-btn {
      margin-top: 0.5rem;
    }
  `,
})
export class OrgChartManualLeadersDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly ref = inject(MatDialogRef<OrgChartManualLeadersDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as OrgChartManualLeadersDialogData;

  parentIds: number[] = [];
  addOptions: SearchableOption<number>[] = [];
  loading = false;

  readonly form = this.fb.group({
    add_parent_id: [null as number | null],
  });

  ngOnInit(): void {
    this.parentIds = [...this.data.parentIds];
    this.refreshAddOptions();
  }

  labelOf(id: number): string {
    return this.data.allNodes.find((n) => n.id === id)?.label ?? `#${id}`;
  }

  private refreshAddOptions(): void {
    const used = new Set([...this.parentIds, this.data.layoutNodeId]);
    this.addOptions = this.data.allNodes
      .filter((n) => !used.has(n.id))
      .map((n) => ({ value: n.id, label: n.label }));
  }

  addParent(): void {
    const pid = this.form.controls.add_parent_id.value;
    if (pid == null || pid <= 0 || this.loading) {
      return;
    }
    this.loading = true;
    this.api
      .post('/org-chart/manual/edges', {
        child_node_id: this.data.layoutNodeId,
        parent_node_id: pid,
      })
      .subscribe({
        next: () => {
          this.parentIds = [...this.parentIds, pid];
          this.form.patchValue({ add_parent_id: null });
          this.refreshAddOptions();
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  removeParent(parentId: number): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.api
      .delete(
        `/org-chart/manual/edges?child_node_id=${this.data.layoutNodeId}&parent_node_id=${parentId}`,
      )
      .subscribe({
        next: () => {
          this.parentIds = this.parentIds.filter((id) => id !== parentId);
          this.refreshAddOptions();
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }
}
