import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Ajusta la barra horizontal del organigrama al tramo entre el primer y último
 * conector vertical (`.oc-drop`) de la fila, sin prolongarse en vacío lateral.
 */
@Directive({
  selector: '.oc-shelf',
  standalone: true,
})
export class OrgChartShelfHbarDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ro?: ResizeObserver;
  private raf = 0;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    this.ro = new ResizeObserver(() => this.requestUpdate());
    this.ro.observe(el);
    const row = el.querySelector(':scope > .oc-row');
    if (row) {
      this.ro.observe(row);
    }
    this.requestUpdate();
  }

  ngOnDestroy(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.ro?.disconnect();
  }

  private requestUpdate(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.update();
    });
  }

  private update(): void {
    const shelf = this.host.nativeElement;
    const drops = shelf.querySelectorAll<HTMLElement>(':scope > .oc-row > .oc-col > .oc-drop');
    if (drops.length < 2) {
      shelf.style.setProperty('--hbar-l', '0px');
      shelf.style.setProperty('--hbar-w', '0px');
      return;
    }
    const s = shelf.getBoundingClientRect();
    const first = drops[0].getBoundingClientRect();
    const last = drops[drops.length - 1].getBoundingClientRect();
    const x1 = first.left + first.width / 2 - s.left;
    const x2 = last.left + last.width / 2 - s.left;
    const left = Math.min(x1, x2);
    const width = Math.max(3, Math.abs(x2 - x1));
    shelf.style.setProperty('--hbar-l', `${left}px`);
    shelf.style.setProperty('--hbar-w', `${width}px`);
  }
}
