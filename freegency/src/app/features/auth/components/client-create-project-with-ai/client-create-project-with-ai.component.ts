import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { firstValueFrom } from 'rxjs';
import { extractApiError } from '../../../../core/http/api-error';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { EntitlementsApiService } from '../../../client/data-access/entitlements-api.service';
import { ProjectDraftApiService } from '../../data-access/project-draft-api.service';
import { ProjectDraftStateService } from '../../data-access/project-draft-state.service';
import { createProjectBasePath, isOnboardingCreateFlow } from '../../utils/create-project-paths';

const MAX_CHARS = 3000;

@Component({
  selector: 'app-client-create-project-with-ai',
  imports: [FormsModule, HugeiconsIconComponent, LoadingComponent, StepFooterActionsComponent],
  templateUrl: './client-create-project-with-ai.component.html',
  styleUrl: './client-create-project-with-ai.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientCreateProjectWithAiComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly draftApi = inject(ProjectDraftApiService);
  private readonly draftState = inject(ProjectDraftStateService);
  private readonly entitlementsApi = inject(EntitlementsApiService);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;
  protected readonly maxChars = MAX_CHARS;
  protected readonly description = signal('');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly currentStep = 1;
  protected readonly totalSteps = 3;
  protected readonly showStepProgress = !isOnboardingCreateFlow(this.router);

  protected readonly charCount = computed(() => this.description().length);
  protected readonly charCountLabel = computed(
    () => `${this.charCount().toLocaleString('en-US')} / ${this.maxChars.toLocaleString('en-US')}`,
  );
  protected readonly canContinue = computed(
    () => this.description().trim().length > 0 && !this.loading(),
  );

  ngOnInit(): void {
    const existing = this.draftState.userInput();
    if (existing) {
      this.description.set(existing);
    }
  }

  protected onDescriptionInput(value: string): void {
    this.description.set(value.slice(0, this.maxChars));
    this.errorMessage.set(null);
  }

  protected onBack(): void {
    void this.router.navigate([createProjectBasePath(this.router)]);
  }

  protected async onContinue(): Promise<void> {
    if (!this.canContinue()) return;

    const userInput = this.description().trim();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.draftState.setMode('ai');
    this.draftState.setUserInput(userInput);

    try {
      // Soft gate before calling the LLM — avoids burning tokens when quota is exhausted.
      const draftQuota = await firstValueFrom(
        this.entitlementsApi.canConsume('GenerateProjectDraft'),
      );
      if (!draftQuota.isAllowed) {
        this.errorMessage.set(
          draftQuota.message?.trim() ||
            'Your plan does not allow AI project drafting, or your quota is used up. Upgrade to continue.',
        );
        return;
      }

      const draft = await firstValueFrom(this.draftApi.generate(userInput));
      this.draftState.setDraft(draft);
      await this.router.navigate([`${createProjectBasePath(this.router)}/with-ai/scope`]);
    } catch (err) {
      this.errorMessage.set(extractApiError(err, 'Could not generate the AI draft. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
