import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowDown01Icon,
  Calendar03Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { ProjectDraftStateService } from '../../data-access/project-draft-state.service';
import { createProjectBasePath, isOnboardingCreateFlow } from '../../utils/create-project-paths';

@Component({
  selector: 'app-client-project-scope',
  imports: [FormsModule, HugeiconsIconComponent, StepFooterActionsComponent],
  templateUrl: './client-project-scope.component.html',
  styleUrl: './client-project-scope.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientProjectScopeComponent {
  private readonly router = inject(Router);
  private readonly draftState = inject(ProjectDraftStateService);

  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly calendarDurationIcon = Calendar03Icon as IconSvgObject;
  protected readonly infoIcon = InformationCircleIcon as IconSvgObject;

  protected readonly isManual = computed(() => this.draftState.mode() === 'manual');
  protected readonly currentStep = computed(() => (this.isManual() ? 3 : 2));
  protected readonly progressSteps = computed(() =>
    this.isManual() ? [1, 2, 3, 4] : [1, 2, 3],
  );
  protected readonly showStepProgress = !isOnboardingCreateFlow(this.router);

  /** Matches Project.IsFixedPrice — true = single price, false = min/max range. */
  protected readonly isFixedPrice = signal(true);
  protected readonly budgetFixed = signal('');
  protected readonly budgetMin = signal('');
  protected readonly budgetMax = signal('');
  protected readonly currency = signal('USD');
  protected readonly duration = signal('');

  protected readonly currencies = ['USD', 'EUR', 'EGP'] as const;

  constructor() {
    const existing = this.draftState.scope();
    if (!existing) return;

    this.isFixedPrice.set(existing.isFixedPrice);
    this.budgetFixed.set(existing.budgetFixed);
    this.budgetMin.set(existing.budgetMin);
    this.budgetMax.set(existing.budgetMax);
    this.currency.set(existing.currency);
    this.duration.set(existing.duration);
  }

  protected readonly canContinue = computed(() => {
    if (this.isFixedPrice()) {
      const amount = Number(this.budgetFixed());
      return Number.isFinite(amount) && amount > 0;
    }

    const min = Number(this.budgetMin());
    const max = Number(this.budgetMax());
    return (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min > 0 &&
      max > 0 &&
      max >= min
    );
  });

  protected setFixedPrice(fixed: boolean): void {
    this.isFixedPrice.set(fixed);
  }

  protected onDigitsInput(
    value: string,
    target: 'budgetFixed' | 'budgetMin' | 'budgetMax',
  ): void {
    const cleaned = value.replace(/[^\d]/g, '').slice(0, 9);
    if (target === 'budgetFixed') this.budgetFixed.set(cleaned);
    else if (target === 'budgetMin') this.budgetMin.set(cleaned);
    else this.budgetMax.set(cleaned);
  }

  protected onBack(): void {
    const base = createProjectBasePath(this.router);
    const path =
      this.draftState.mode() === 'manual'
        ? `${base}/manual/taxonomy`
        : `${base}/with-ai`;
    void this.router.navigate([path]);
  }

  protected onContinue(): void {
    if (!this.canContinue()) return;

    this.draftState.setScope({
      isFixedPrice: this.isFixedPrice(),
      budgetFixed: this.budgetFixed(),
      budgetMin: this.budgetMin(),
      budgetMax: this.budgetMax(),
      currency: this.currency(),
      duration: this.duration(),
    });

    const base = createProjectBasePath(this.router);
    const overview =
      this.draftState.mode() === 'manual'
        ? `${base}/manual/overview`
        : `${base}/with-ai/overview`;
    void this.router.navigate([overview]);
  }
}
