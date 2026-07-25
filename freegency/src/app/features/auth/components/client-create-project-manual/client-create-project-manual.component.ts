import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { ProjectDraftStateService } from '../../data-access/project-draft-state.service';

const MAX_CHARS = 3000;

const EXAMPLE_TITLES = [
  'UX/UI Designer for FinTech Mobile App',
  'Facebook ad specialist needed for product launch',
] as const;

@Component({
  selector: 'app-client-create-project-manual',
  imports: [FormsModule, StepFooterActionsComponent],
  templateUrl: './client-create-project-manual.component.html',
  styleUrl: './client-create-project-manual.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientCreateProjectManualComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly draftState = inject(ProjectDraftStateService);

  protected readonly maxChars = MAX_CHARS;
  protected readonly exampleTitles = EXAMPLE_TITLES;
  protected readonly currentStep = 1;
  protected readonly totalSteps = [1, 2, 3, 4] as const;

  protected readonly title = signal('');
  protected readonly description = signal('');

  protected readonly charCount = computed(() => this.description().length);
  protected readonly charCountLabel = computed(
    () => `${this.charCount().toLocaleString('en-US')} / ${this.maxChars.toLocaleString('en-US')}`,
  );

  protected readonly canContinue = computed(
    () => this.title().trim().length > 0 && this.description().trim().length > 0,
  );

  ngOnInit(): void {
    this.draftState.setMode('manual');
    const draft = this.draftState.draft();
    if (draft?.title) this.title.set(draft.title);
    if (draft?.description) this.description.set(draft.description);
  }

  protected onTitleInput(value: string): void {
    this.title.set(value);
  }

  protected onDescriptionInput(value: string): void {
    this.description.set(value.slice(0, this.maxChars));
  }

  protected onBack(): void {
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/create-project`]);
  }

  protected onContinue(): void {
    if (!this.canContinue()) return;

    const title = this.title().trim();
    const description = this.description().trim();
    const existing = this.draftState.draft();

    this.draftState.setMode('manual');
    this.draftState.setDraft({
      title,
      description,
      categoryId: existing?.categoryId ?? null,
      categoryName: existing?.categoryName ?? null,
      needsManualCategoryReview: existing?.needsManualCategoryReview ?? true,
      specialtyIds: existing?.specialtyIds ?? [],
      specialtyNames: existing?.specialtyNames ?? [],
      skillIds: existing?.skillIds ?? [],
      skillNames: existing?.skillNames ?? [],
    });

    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/create-project/manual/taxonomy`]);
  }
}
