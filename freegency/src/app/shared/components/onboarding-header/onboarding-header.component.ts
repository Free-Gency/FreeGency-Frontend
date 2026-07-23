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

  protected readonly steps = [
    { id: 1 as const, label: 'Profile' },
    { id: 2 as const, label: 'Interests' },
    { id: 3 as const, label: 'Create a Project' },
  ];

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
