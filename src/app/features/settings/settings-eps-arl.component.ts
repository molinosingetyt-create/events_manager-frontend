import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService, Paginated } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { realtimeAffectsTable } from '../../core/utils/realtime-tables';
import { TranslateLabelPipe } from '../../core/pipes/translate-label.pipe';
import { downloadEpsArlTemplate } from '../../core/utils/excel-catalog-templates';
import type { ImportSummary } from '../../core/utils/excel-import-runners';
import { importEpsArlExcel } from '../../core/utils/excel-import-runners';
import { EpsArlDialogComponent, type EpsArlRow } from '../incapacity-catalog/eps-arl-dialog.component';
import { showImportFeedback } from './settings-import-feedback';
import { ImportLoadingOverlayComponent } from '../../shared/import-loading-overlay/import-loading-overlay.component';

@Component({
  selector: 'em-settings-eps-arl',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateLabelPipe,
    ImportLoadingOverlayComponent,
  ],
  template: `
    <em-import-loading-overlay [active]="excelBusy" />
    <div class="page-head">
      <h1>EPS / ARL</h1>
      <p class="page-lead">
        Entidades de salud y riesgos laborales. <strong>Plantilla Excel</strong> e importación por primera hoja.
      </p>
    </div>
    <mat-card>
      <mat-card-content class="table-scroll">
        <div class="toolbar-row">
          <button mat-flat-button color="primary" type="button" (click)="openDialog()">
            <mat-icon>add</mat-icon>
            Nuevo registro
          </button>
          <button mat-stroked-button type="button" (click)="downloadTemplate()" [disabled]="excelBusy">
            <mat-icon>download</mat-icon>
            Plantilla Excel
          </button>
          <button mat-stroked-button type="button" (click)="triggerImport()" [disabled]="excelBusy">
            <mat-icon>upload_file</mat-icon>
            Importar Excel
          </button>
        </div>
        <input
          #fileInput
          type="file"
          class="sr-only"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          (change)="onFile($event)"
        />
        <table mat-table [dataSource]="rows" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let r">{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="kind">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let r">{{ r.kind === 'eps' ? 'EPS' : 'ARL' }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let r">{{ r.name }}</td>
          </ng-container>
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let r">{{ r.code || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">{{ r.status | translateLabel: 'entityStatus' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let r">
              <div class="action-row">
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-edit"
                  (click)="openDialog(r)"
                  matTooltip="Editar EPS/ARL"
                  matTooltipPosition="above"
                  aria-label="Editar EPS/ARL"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  class="action-btn-delete"
                  (click)="deleteRow(r)"
                  matTooltip="Desactivar"
                  matTooltipPosition="above"
                  aria-label="Desactivar EPS/ARL"
                >
                  <mat-icon>visibility_off</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator
          [length]="total"
          [pageIndex]="page - 1"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
        />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
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
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .full {
      min-width: 640px;
      width: 100%;
    }
  `,
})
export class SettingsEpsArlComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly realtime = inject(RealtimeService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.realtime.dataChanged$.pipe(takeUntilDestroyed()).subscribe((msg) => {
      if (realtimeAffectsTable(msg, 'eps_arl')) {
        this.load();
      }
    });
  }

  rows: EpsArlRow[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  excelBusy = false;

  readonly columns = ['id', 'kind', 'name', 'code', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api
      .get<Paginated<EpsArlRow>>('/eps-arl', { page: this.page, page_size: this.pageSize })
      .subscribe((res) => {
        this.rows = res.items;
        this.total = res.total;
      });
  }

  openDialog(row?: EpsArlRow): void {
    this.dialog
      .open(EpsArlDialogComponent, { width: 'min(96vw, 440px)', data: { row } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  deleteRow(r: EpsArlRow): void {
    if (!confirm(`¿Desactivar «${r.name}»?`)) {
      return;
    }
    this.api.delete(`/eps-arl/${r.id}`).subscribe({ next: () => this.load() });
  }

  onPage(ev: PageEvent): void {
    this.page = ev.pageIndex + 1;
    this.pageSize = ev.pageSize;
    this.load();
  }

  async downloadTemplate(): Promise<void> {
    this.excelBusy = true;
    try {
      await downloadEpsArlTemplate();
    } finally {
      this.excelBusy = false;
    }
  }

  triggerImport(): void {
    setTimeout(() => this.fileInput?.nativeElement.click());
  }

  async onFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.excelBusy = true;
    try {
      const summary: ImportSummary = await importEpsArlExcel(this.api, file);
      showImportFeedback(this.snack, summary);
      this.load();
    } finally {
      this.excelBusy = false;
    }
  }
}
