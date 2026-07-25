import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  QuillWrite01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';

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

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;
  protected readonly quillIcon = QuillWrite01Icon as IconSvgObject;
  protected readonly arrowRightIcon = ArrowRight01Icon as IconSvgObject;
  protected readonly checkBadgeIcon = CheckmarkBadge01Icon as IconSvgObject;

  protected onGenerateWithAi(): void {
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/create-project/with-ai`]);
  }

  protected onWithoutAi(): void {
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/create-project/manual`]);
  }
}
