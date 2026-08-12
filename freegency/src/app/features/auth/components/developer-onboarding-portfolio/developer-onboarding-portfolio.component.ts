import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  Delete02Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { catchError, firstValueFrom, of } from 'rxjs';
import { DEVELOPER_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { CategoriesApiService } from '../../data-access/categories-api.service';
import { PortfolioApiService } from '../../data-access/portfolio-api.service';
import { ProfileApiService } from '../../data-access/profile-api.service';
import { TaxonomyApiService } from '../../data-access/taxonomy-api.service';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ChipOption {
  id: string;
  label: string;
}

interface RoadmapRow {
  title: string;
  isDone: boolean;
}

interface MetricRow {
  value: string;
  label: string;
}

@Component({
  selector: 'app-developer-onboarding-portfolio',
  imports: [FormsModule, HugeiconsIconComponent],
  templateUrl: './developer-onboarding-portfolio.component.html',
  styleUrl: './developer-onboarding-portfolio.component.css',
})
export class DeveloperOnboardingPortfolioComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly deleteIcon = Delete02Icon as IconSvgObject;
  protected readonly tickIcon = Tick02Icon as IconSvgObject;

  protected readonly step = signal<WizardStep>(1);
  protected readonly saving = signal(false);
  protected readonly loadingSkills = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly imageFiles = signal<File[]>([]);
  protected readonly imagePreviewUrls = signal<string[]>([]);

  protected readonly challenge = signal('');
  protected readonly solution = signal('');

  protected readonly projectUrl = signal('');
  protected readonly prototypeUrl = signal('');
  protected readonly budget = signal('');
  protected readonly durationLabel = signal('');
  protected readonly completionDate = signal('');
  protected readonly industry = signal('');
  protected readonly visibility = signal('Public');

  protected readonly categories = signal<ChipOption[]>([]);
  protected readonly allSkills = signal<ChipOption[]>([]);
  protected readonly selectedSkillIds = signal<string[]>([]);

  protected readonly roadmap = signal<RoadmapRow[]>([{ title: '', isDone: false }]);
  protected readonly metrics = signal<MetricRow[]>([{ value: '', label: '' }]);

  protected readonly testimonialQuote = signal('');
  protected readonly testimonialAuthorName = signal('');
  protected readonly testimonialAuthorTitle = signal('');

  protected readonly stepLabels = [
    'Basics',
    'Story',
    'Details',
    'Skills',
    'Outcomes',
    'Testimonial',
    'Publish',
  ] as const;

  protected readonly selectedCategoryLabel = computed(() => {
    const id = this.categoryId();
    return this.categories().find((c) => c.id === id)?.label || '—';
  });

  protected readonly roadmapCount = computed(
    () => this.roadmap().filter((r) => r.title.trim()).length,
  );

  protected readonly metricsCount = computed(
    () => this.metrics().filter((m) => m.value.trim()).length,
  );

  ngOnInit(): void {
    this.categoriesApi
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (cats) => {
          this.categories.set(
            cats.map((c) => ({
              id: c.id,
              label: (c.nameEn || c.name || '').trim() || 'Category',
            })),
          );
        },
      });

    this.loadDeveloperSkills();
  }

  ngOnDestroy(): void {
    for (const url of this.imagePreviewUrls()) URL.revokeObjectURL(url);
  }

  protected goToStep(step: number): void {
    if (step >= 1 && step <= 7) this.step.set(step as WizardStep);
  }

  protected next(): void {
    if (this.step() < 7) this.step.set((this.step() + 1) as WizardStep);
  }

  protected back(): void {
    this.errorMessage.set(null);
    if (this.step() > 1) this.step.set((this.step() - 1) as WizardStep);
  }

  protected toggleSkill(id: string): void {
    const selected = this.selectedSkillIds();
    this.selectedSkillIds.set(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }

  protected onImagesPicked(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []).slice(0, 10);
    for (const url of this.imagePreviewUrls()) URL.revokeObjectURL(url);
    this.imageFiles.set(files);
    this.imagePreviewUrls.set(files.map((f) => URL.createObjectURL(f)));
  }

  protected addRoadmapRow(): void {
    this.roadmap.update((rows) => [...rows, { title: '', isDone: false }]);
  }

  protected removeRoadmapRow(index: number): void {
    this.roadmap.update((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length ? next : [{ title: '', isDone: false }];
    });
  }

  protected updateRoadmapTitle(index: number, title: string): void {
    this.roadmap.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, title } : row)),
    );
  }

  protected toggleRoadmapDone(index: number): void {
    this.roadmap.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, isDone: !row.isDone } : row)),
    );
  }

  protected addMetricRow(): void {
    this.metrics.update((rows) => [...rows, { value: '', label: '' }]);
  }

  protected removeMetricRow(index: number): void {
    this.metrics.update((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length ? next : [{ value: '', label: '' }];
    });
  }

  protected updateMetric(index: number, patch: Partial<MetricRow>): void {
    this.metrics.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  protected async onPublish(): Promise<void> {
    if (this.saving()) return;
    this.errorMessage.set(null);

    const title = this.title().trim();
    if (!title) {
      this.errorMessage.set('Project title is required to save a portfolio item.');
      this.step.set(1);
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(
        this.portfolioApi.createDeveloperPortfolio({
          title,
          description: this.description(),
          budget: this.budget() ? Number(this.budget()) : null,
          projectUrl: this.projectUrl().trim() || null,
          prototypeUrl: this.prototypeUrl().trim() || null,
          completionDate: this.completionDate() || null,
          categoryId: this.categoryId(),
          visibility: this.visibility(),
          challenge: this.challenge(),
          solution: this.solution(),
          durationLabel: this.durationLabel(),
          industry: this.industry(),
          testimonialQuote: this.testimonialQuote(),
          testimonialAuthorName: this.testimonialAuthorName(),
          testimonialAuthorTitle: this.testimonialAuthorTitle(),
          skillIds: this.selectedSkillIds(),
          roadmapSteps: this.roadmap()
            .filter((r) => r.title.trim())
            .map((r, index) => ({
              title: r.title.trim(),
              isDone: r.isDone,
              sortOrder: index,
            })),
          metrics: this.metrics()
            .filter((m) => m.value.trim() && m.label.trim())
            .map((m, index) => ({
              value: m.value.trim(),
              label: m.label.trim(),
              sortOrder: index,
            })),
          images: this.imageFiles(),
        }),
      );
      await this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/complete`]);
    } catch (err) {
      this.saving.set(false);
      this.errorMessage.set(this.describeSaveError(err));
    }
  }

  protected onSkip(): void {
    if (this.saving()) return;
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/complete`]);
  }

  protected goBackToSkills(): void {
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/skills`]);
  }

  /** Prefer API message; if missing, show status + raw body so the real cause is visible. */
  private describeSaveError(err: unknown): string {
    const parsed = extractApiError(err, '');
    if (parsed.trim()) return parsed;

    if (err instanceof HttpErrorResponse) {
      const raw =
        typeof err.error === 'string'
          ? err.error
          : err.error != null
            ? JSON.stringify(err.error)
            : err.statusText || '';
      const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 280);
      return snippet
        ? `Save failed (HTTP ${err.status}): ${snippet}`
        : `Save failed (HTTP ${err.status}). Check API logs / Network tab.`;
    }

    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return 'Could not save portfolio project.';
  }

  private loadDeveloperSkills(): void {
    this.loadingSkills.set(true);
    this.profileApi
      .getDeveloperProfile()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (profile) => {
          const interests = profile?.interests ?? [];
          const specialtyIds = interests
            .flatMap((i) => i.specialties ?? [])
            .map((s) => s.id)
            .filter(Boolean);
          const existingSkills = interests
            .flatMap((i) => i.specialties ?? [])
            .flatMap((s) => s.skills ?? [])
            .map((sk) => ({
              id: sk.id,
              label: (sk.name || '').trim() || sk.id,
            }))
            .filter((s) => s.id);

          if (!specialtyIds.length) {
            const byId = new Map(existingSkills.map((s) => [s.id, s]));
            this.allSkills.set([...byId.values()].sort((a, b) => a.label.localeCompare(b.label)));
            this.selectedSkillIds.set([...byId.keys()]);
            this.loadingSkills.set(false);
            return;
          }

          this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
            next: (skills) => {
              const fromTaxonomy = skills.map((s) => ({
                id: s.id,
                label: (s.name || '').trim() || 'Skill',
              }));
              const byId = new Map<string, ChipOption>();
              for (const s of [...fromTaxonomy, ...existingSkills]) byId.set(s.id, s);
              this.allSkills.set(
                [...byId.values()].sort((a, b) => a.label.localeCompare(b.label)),
              );
              const existingIds = existingSkills.map((s) => s.id).filter((id) => byId.has(id));
              this.selectedSkillIds.set([...new Set(existingIds)]);
              this.loadingSkills.set(false);
            },
            error: () => {
              const byId = new Map(existingSkills.map((s) => [s.id, s]));
              this.allSkills.set([...byId.values()]);
              this.selectedSkillIds.set([...byId.keys()]);
              this.loadingSkills.set(false);
            },
          });
        },
        error: () => {
          this.allSkills.set([]);
          this.loadingSkills.set(false);
        },
      });
  }
}
