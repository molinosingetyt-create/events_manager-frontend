import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Ajusta barras horizontales entre columnas del organigrama.
 * Corrige zoom (transform) y el bloque jefe → varios líderes → operarios.
 */
@Directive({
  selector: '.oc-shelf',
  standalone: true,
})
export class OrgChartShelfHbarDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ro?: ResizeObserver;
  private mo?: MutationObserver;
  private raf = 0;
  private readonly onReflow = () => this.requestUpdate();

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    this.ro = new ResizeObserver(() => this.requestUpdate());
    this.ro.observe(el);
    const canvas = el.closest('.oc-canvas');
    if (canvas) {
      this.ro.observe(canvas);
      this.mo = new MutationObserver(() => this.requestUpdate());
      this.mo.observe(canvas, { attributes: true, attributeFilter: ['style'] });
    }
    for (const band of el.querySelectorAll('.oc-connector-band')) {
      this.ro.observe(band);
    }
    const leaderShelf = el.querySelector('.oc-leader-shelf');
    if (leaderShelf) {
      this.ro.observe(leaderShelf);
    }
    window.addEventListener('resize', this.onReflow);
    window.addEventListener('oc-chart-reflow', this.onReflow);
    this.requestUpdate();
  }

  ngOnDestroy(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.ro?.disconnect();
    this.mo?.disconnect();
    window.removeEventListener('resize', this.onReflow);
    window.removeEventListener('oc-chart-reflow', this.onReflow);
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

  private scaleFor(band: HTMLElement): number {
    const canvas = band.closest('.oc-canvas') as HTMLElement | null;
    return this.visualScale(canvas ?? band);
  }

  private visualScale(el: HTMLElement): number {
    const ow = el.offsetWidth;
    if (ow <= 0) {
      return 1;
    }
    const rw = el.getBoundingClientRect().width;
    return rw > 0 ? rw / ow : 1;
  }

  private update(): void {
    const shelf = this.host.nativeElement;
    if (shelf.classList.contains('oc-shelf--under-boss')) {
      this.updateUnderBossShelf(shelf);
      return;
    }
    const leaderBand = shelf.querySelector<HTMLElement>(':scope > .oc-connector-band--leaders');
    if (leaderBand) {
      this.updateLeadersBand(leaderBand);
      return;
    }
    const band = shelf.querySelector<HTMLElement>(':scope > .oc-connector-band');
    if (!band) {
      return;
    }
    this.positionHbarFromRow(band);
  }

  /** Puntos de anclaje: si hay bloque de jefes dentro de una columna, usa cada jefe (p. ej. Manuel). */
  private collectRowAnchors(row: HTMLElement): HTMLElement[] {
    const anchors: HTMLElement[] = [];
    for (const col of row.querySelectorAll<HTMLElement>(':scope > .oc-col')) {
      const leaderShelf = col.querySelector(':scope > .oc-leader-shelf');
      if (leaderShelf) {
        for (const lc of leaderShelf.querySelectorAll<HTMLElement>(
          '.oc-connector-band--leaders > .oc-row > .oc-col',
        )) {
          const point =
            lc.querySelector<HTMLElement>('.oc-drop--peer-up') ??
            lc.querySelector<HTMLElement>('.oc-drop--from-boss') ??
            lc.querySelector<HTMLElement>('.oc-drop') ??
            lc.querySelector<HTMLElement>('.oc-node');
          anchors.push((point ?? lc) as HTMLElement);
        }
        continue;
      }
      const drop = col.querySelector<HTMLElement>(':scope > .oc-drop');
      anchors.push((drop ?? col) as HTMLElement);
    }
    return anchors;
  }

  private clearBandAnchorOffsets(band: HTMLElement): void {
    for (const el of band.querySelectorAll<HTMLElement>(
      '.oc-drop, .oc-drop--peer-up, .oc-drop--from-boss',
    )) {
      el.style.marginTop = '';
    }
  }

  private positionHbarFromRow(band: HTMLElement): void {
    this.clearBandAnchorOffsets(band);
    const row = band.querySelector<HTMLElement>(':scope > .oc-row');
    const hbar = band.querySelector<HTMLElement>(':scope > .oc-hbar');
    if (!row) {
      this.positionHbarFromDrops(band);
      return;
    }
    const anchors = this.collectRowAnchors(row);
    if (!anchors.length) {
      this.positionHbarFromDrops(band);
      return;
    }
    this.positionHbarFromAnchors(band, anchors, hbar ?? undefined);
  }

  private updateUnderBossShelf(shelf: HTMLElement): void {
    const leadersBand = shelf.querySelector<HTMLElement>(
      '.oc-leader-shelf .oc-connector-band--leaders',
    );
    if (leadersBand) {
      this.updateLeadersBand(leadersBand);
    }
    const opShelf = shelf.querySelector<HTMLElement>(
      '.oc-leader-shelf > .oc-multi-shelves > .oc-shelf:not(.oc-shelf--leaders)',
    );
    if (opShelf) {
      const band = opShelf.querySelector<HTMLElement>(':scope > .oc-connector-band');
      if (band) {
        this.positionHbarFromRow(band);
      }
    }
  }

  private updateLeadersBand(leaderBand: HTMLElement): void {
    this.clearBandAnchorOffsets(leaderBand);
    const cols = leaderBand.querySelectorAll<HTMLElement>(':scope > .oc-row > .oc-col');
    const bossIn = leaderBand.querySelector<HTMLElement>('.oc-hbar--boss-in');
    const leadersOut = leaderBand.querySelector<HTMLElement>('.oc-hbar--leaders-out');
    if (bossIn) {
      const bossDrops = leaderBand.querySelectorAll<HTMLElement>(
        ':scope > .oc-row > .oc-col > .oc-drop--from-boss',
      );
      if (bossDrops.length) {
        this.positionHbarFromAnchors(leaderBand, [...bossDrops], bossIn);
      } else {
        this.positionHbarFromCols(leaderBand, cols, bossIn);
      }
    }
    if (leadersOut) {
      this.positionHbarFromCols(leaderBand, cols, leadersOut);
    }
  }

  private positionHbarFromAnchors(
    band: HTMLElement,
    anchors: HTMLElement[],
    hbar?: HTMLElement,
  ): void {
    const target = hbar ?? band;
    if (!anchors.length) {
      target.style.setProperty('--hbar-l', '0px');
      target.style.setProperty('--hbar-w', '0px');
      target.style.removeProperty('--hbar-t');
      this.resetAnchorOffsets(anchors);
      return;
    }
    const scale = this.scaleFor(band);
    const bandScreen = band.getBoundingClientRect();
    const rects = anchors.map((a) => a.getBoundingClientRect());

    if (anchors.length === 1) {
      const el = rects[0];
      const cx = (el.left + el.width / 2 - bandScreen.left) / scale;
      const barTop = (el.top + el.height / 2 - bandScreen.top) / scale - 2;
      target.style.setProperty('--hbar-l', `${Math.max(0, cx - 2)}px`);
      target.style.setProperty('--hbar-w', '4px');
      target.style.setProperty('--hbar-t', `${Math.max(0, barTop)}px`);
      this.alignAnchorsToBar(anchors, rects, bandScreen.top + barTop * scale, scale);
      return;
    }

    const leftPx = Math.min(...rects.map((r) => r.left + r.width / 2));
    const rightPx = Math.max(...rects.map((r) => r.left + r.width / 2));
    const left = (leftPx - bandScreen.left) / scale;
    const width = Math.max(4, (rightPx - leftPx) / scale);
    const busTopPx = Math.max(...rects.map((r) => r.top + r.height / 2));
    const barTop = (busTopPx - bandScreen.top) / scale - 2;
    target.style.setProperty('--hbar-l', `${left}px`);
    target.style.setProperty('--hbar-w', `${width}px`);
    target.style.setProperty('--hbar-t', `${Math.max(0, barTop)}px`);
    this.alignAnchorsToBar(anchors, rects, busTopPx, scale);
  }

  /** Misma altura de bus: baja conectores que quedaron más arriba (p. ej. DG junto a bloque de jefes). */
  private alignAnchorsToBar(
    anchors: HTMLElement[],
    rects: DOMRect[],
    busCenterY: number,
    scale: number,
  ): void {
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const r = rects[i];
      const anchorCenter = r.top + r.height / 2;
      const offset = (busCenterY - anchorCenter) / scale;
      if (offset > 2) {
        anchor.style.marginTop = `${Math.round(offset)}px`;
      } else {
        anchor.style.marginTop = '';
      }
    }
  }

  private resetAnchorOffsets(anchors: HTMLElement[]): void {
    for (const anchor of anchors) {
      anchor.style.marginTop = '';
    }
  }

  private positionHbarFromDrops(band: HTMLElement): void {
    const row = band.querySelector<HTMLElement>(':scope > .oc-row');
    if (row) {
      const anchors = this.collectRowAnchors(row);
      if (anchors.length) {
        const hbar = band.querySelector<HTMLElement>(':scope > .oc-hbar');
        this.positionHbarFromAnchors(band, anchors, hbar ?? undefined);
        return;
      }
    }
    const drops = band.querySelectorAll<HTMLElement>(':scope > .oc-row > .oc-col > .oc-drop');
    if (!drops.length) {
      band.style.setProperty('--hbar-l', '0px');
      band.style.setProperty('--hbar-w', '0px');
      return;
    }
    const hbar = band.querySelector<HTMLElement>(':scope > .oc-hbar');
    this.positionHbarFromAnchors(band, [...drops], hbar ?? undefined);
  }

  private positionHbarFromCols(
    band: HTMLElement,
    cols: NodeListOf<HTMLElement>,
    hbar?: HTMLElement,
  ): void {
    const anchors = [...cols];
    this.positionHbarFromAnchors(band, anchors, hbar);
  }
}
