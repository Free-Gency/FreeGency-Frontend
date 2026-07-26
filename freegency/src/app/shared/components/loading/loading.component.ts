import { Component, input } from '@angular/core';

export type LoadingSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.css',
  host: {
    class: 'inline-flex items-center justify-center',
    role: 'status',
    '[attr.aria-label]': 'label()',
    '[attr.aria-busy]': 'true',
  },
})
export class LoadingComponent {
  /** Visual size of the FreeGency loading mark. */
  readonly size = input<LoadingSize>('lg');
  /** Accessible label announced to screen readers. */
  readonly label = input('Loading');
}
