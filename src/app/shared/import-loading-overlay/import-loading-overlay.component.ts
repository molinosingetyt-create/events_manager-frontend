import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Capa a pantalla completa con spinner mientras corre importación/descarga Excel.
 * Bloquea clics en el resto de la UI (`z-index` alto, fondo semitransparente).
 */
@Component({
  selector: 'em-import-loading-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (active) {
      <div class="em-import-overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="em-import-overlay__card">
          <mat-spinner diameter="48" />
          <p class="em-import-overlay__text">{{ message }}</p>
        </div>
      </div>
    }
  `,
  styles: `
    .em-import-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      cursor: wait;
      pointer-events: auto;
      touch-action: none;
      overscroll-behavior: none;
    }
    .em-import-overlay__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1.75rem 2rem;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: min(90vw, 320px);
      text-align: center;
    }
    .em-import-overlay__text {
      margin: 0;
      font-size: 0.95rem;
      color: #A37F3E;
      font-weight: 500;
      line-height: 1.4;
    }
  `,
})
export class ImportLoadingOverlayComponent {
  @Input() active = false;
  @Input() message = 'Procesando, espere…';
}
