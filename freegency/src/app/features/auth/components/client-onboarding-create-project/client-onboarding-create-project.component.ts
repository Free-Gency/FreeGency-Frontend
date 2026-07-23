import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { ProfileApiService } from '../../data-access/profile-api.service';

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
  private readonly auth = inject(AuthService);
  private readonly profileApi = inject(ProfileApiService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;

  protected onGenerateWithAi(): void {
    void this.finish('/');
  }

  protected onWithoutAi(): void {
    void this.finish('/');
  }

  protected onSkip(): void {
    void this.finish(`${CLIENT_ONBOARDING_PATH}/complete`);
  }

  private async finish(nextUrl: string): Promise<void> {
    if (this.loading()) return;

    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      await firstValueFrom(this.profileApi.completeOnboarding());
      this.auth.markOnboardingComplete();
      await this.router.navigateByUrl(nextUrl);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err));
    }
  }
}
