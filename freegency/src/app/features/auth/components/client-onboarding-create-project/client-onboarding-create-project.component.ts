import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../shared/services/toast.service';
import { EntitlementsApiService } from '../../../client/data-access/entitlements-api.service';
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
  private readonly entitlementsApi = inject(EntitlementsApiService);
  private readonly toast = inject(ToastService);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;
  protected readonly checkingAi = signal(false);
  protected readonly checkingManual = signal(false);

  protected onGenerateWithAi(): void {
    void this.guardAiAndNavigate(`${ONBOARDING_CREATE_PROJECT_PATH}/with-ai`);
  }

  protected onWithoutAi(): void {
    void this.guardAndNavigate({
      checking: this.checkingManual,
      features: ['CreateProject'],
      path: `${ONBOARDING_CREATE_PROJECT_PATH}/manual`,
      fallback:
        'You have reached your Create Project limit for this period. Upgrade your plan to continue.',
    });
  }

  protected onSkip(): void {
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/complete`]);
  }

  private async guardAiAndNavigate(path: string): Promise<void> {
    if (this.checkingAi()) return;
    this.checkingAi.set(true);
    try {
      const eligibility = await firstValueFrom(this.entitlementsApi.getProjectDraftEligibility());
      if (!eligibility.canCreateProject || !eligibility.canGenerateDraft) {
        this.toast.error(
          eligibility.message?.trim() ||
            eligibility.createProject?.message?.trim() ||
            eligibility.generateProjectDraft?.message?.trim() ||
            'Your plan does not allow AI project drafting, or your quota is used up. Upgrade to continue.',
        );
        return;
      }
      await this.router.navigate([path]);
    } catch (err) {
      this.toast.error(
        extractApiError(err, 'Could not verify your plan. Restart the API and try again.'),
      );
    } finally {
      this.checkingAi.set(false);
    }
  }

  private async guardAndNavigate(opts: {
    checking: ReturnType<typeof signal<boolean>>;
    features: Array<'CreateProject' | 'GenerateProjectDraft'>;
    path: string;
    fallback: string;
  }): Promise<void> {
    if (opts.checking()) return;
    opts.checking.set(true);
    try {
      for (const feature of opts.features) {
        const check = await firstValueFrom(this.entitlementsApi.canConsume(feature));
        if (!check.isAllowed) {
          this.toast.error(check.message?.trim() || opts.fallback);
          return;
        }
      }
      await this.router.navigate([opts.path]);
    } catch (err) {
      this.toast.error(extractApiError(err, opts.fallback));
    } finally {
      opts.checking.set(false);
    }
  }
}
