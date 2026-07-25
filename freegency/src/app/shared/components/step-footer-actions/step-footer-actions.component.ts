import { Component, input, output } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-step-footer-actions',
  imports: [HugeiconsIconComponent],
  templateUrl: './step-footer-actions.component.html',
})
export class StepFooterActionsComponent {
  protected readonly arrowLeftIcon = ArrowLeft01Icon as IconSvgObject;

  /** Label for the back control. */
  readonly backLabel = input('Go back');
  /** Label for the primary CTA. */
  readonly continueLabel = input('Continue');
  readonly continueDisabled = input(false);
  readonly continueLoading = input(false);
  readonly continueLoadingLabel = input('Saving...');
  readonly showBack = input(true);

  /** Optional secondary CTA (e.g. Save Draft). Hidden when empty. */
  readonly secondaryLabel = input<string | null>(null);
  readonly secondaryDisabled = input(false);

  readonly back = output<void>();
  readonly continue = output<void>();
  readonly secondary = output<void>();
}
