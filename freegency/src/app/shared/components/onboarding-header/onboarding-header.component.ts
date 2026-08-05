import { Component, computed, input } from '@angular/core';

export type OnboardingStep = 1 | 2 | 3;

const PROGRESS: Record<OnboardingStep, string> = {
  1: '40px',
  2: '40.97%',
  /** Figma step 3: fill stops short of the track end (~80%). */
  3: '80%',
};

@Component({
  selector: 'app-onboarding-header',
  templateUrl: './onboarding-header.component.html',
  styleUrl: './onboarding-header.component.css',
})
export class OnboardingHeaderComponent {
  /** 1 = Profile, 2 = Interests, 3 = Create a Project */
  readonly step = input<OnboardingStep>(1);

  /** When true, progress fills to 100% (complete screen). */
  readonly filled = input(false);

  /** Optional labels for the three steps (defaults to Client onboarding). */
  readonly stepLabels = input<[string, string, string] | null>(null);

  protected readonly steps = computed(() => {
    const labels = this.stepLabels() ?? (['Profile', 'Interests', 'Create a Project'] as const);
    return [
      { id: 1 as const, label: labels[0] },
      { id: 2 as const, label: labels[1] },
      { id: 3 as const, label: labels[2] },
    ];
  });

  protected readonly progress = computed(() =>
    this.filled() ? '100%' : PROGRESS[this.step()],
  );

  protected isActive(id: OnboardingStep): boolean {
    return this.step() === id;
  }

  protected isCompleted(id: OnboardingStep): boolean {
    return this.step() > id;
  }

  protected isUpcoming(id: OnboardingStep): boolean {
    return this.step() < id;
  }

  protected isDividerActive(afterStepId: OnboardingStep): boolean {
    return this.step() > afterStepId;
  }
}
