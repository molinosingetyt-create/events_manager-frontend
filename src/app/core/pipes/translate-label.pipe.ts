import { Pipe, PipeTransform } from '@angular/core';
import { LABELS, LabelKind } from '../i18n/labels';

@Pipe({
  name: 'translateLabel',
  standalone: true,
})
export class TranslateLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: LabelKind): string {
    if (value == null || value === '') {
      return '—';
    }
    const map = LABELS[kind] as Record<string, string>;
    return map[value] ?? value;
  }
}
