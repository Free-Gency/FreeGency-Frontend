import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { ONBOARDING_CREATE_PROJECT_PATH } from '../../utils/create-project-paths';

@Component({
  selector: 'app-client-onboarding-create-project',
  imports: [HugeiconsIconComponent],
  templateUrl: './client-onboarding-create-project.component.html',
  styleUrl: './client-onboarding-create-project.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientOnboardingCreateProjectComponent {
  private readonly router = inject(Router);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;

  protected onGenerateWithAi(): void {
    void this.router.navigate([`${ONBOARDING_CREATE_PROJECT_PATH}/with-ai`]);
  }

  protected onWithoutAi(): void {
    void this.router.navigate([`${ONBOARDING_CREATE_PROJECT_PATH}/manual`]);
  }

  protected onSkip(): void {
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/complete`]);
  }
}
