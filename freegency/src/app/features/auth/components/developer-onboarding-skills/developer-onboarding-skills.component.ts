import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { DEVELOPER_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { ProfileApiService } from '../../data-access/profile-api.service';
import {
  TaxonomyApiService,
  type TaxonomySkill,
  type TaxonomySpecialty,
} from '../../data-access/taxonomy-api.service';

const MAX_SKILLS = 15;

@Component({
  selector: 'app-developer-onboarding-skills',
  imports: [HugeiconsIconComponent],
  templateUrl: './developer-onboarding-skills.component.html',
  styleUrl: './developer-onboarding-skills.component.css',
})
export class DeveloperOnboardingSkillsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly checkIcon = CheckmarkCircle02Icon as IconSvgObject;
  protected readonly maxSkills = MAX_SKILLS;

  protected readonly categoryIds = signal<string[]>([]);
  protected readonly specialties = signal<TaxonomySpecialty[]>([]);
  protected readonly selectedSpecialtyIds = signal<string[]>([]);
  protected readonly availableSkills = signal<TaxonomySkill[]>([]);
  protected readonly selectedSkillIds = signal<string[]>([]);

  protected readonly loading = signal(false);
  protected readonly loadingTaxonomy = signal(true);
  protected readonly loadingSkills = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly popularSkills = computed(() => {
    const selected = new Set(this.selectedSkillIds());
    return this.availableSkills()
      .filter((s) => !selected.has(s.id))
      .slice(0, 16);
  });

  protected readonly selectedSkills = computed(() => {
    const byId = new Map(this.availableSkills().map((s) => [s.id, s]));
    return this.selectedSkillIds().map(
      (id) => byId.get(id) ?? ({ id, name: id } satisfies TaxonomySkill),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  protected specialtyLabel(s: TaxonomySpecialty): string {
    return s.nameEn || s.nameAr || s.id;
  }

  protected isSpecialtySelected(id: string): boolean {
    return this.selectedSpecialtyIds().includes(id);
  }

  protected toggleSpecialty(id: string): void {
    this.selectedSpecialtyIds.update((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      this.reloadSkills(next);
      return next;
    });
  }

  protected toggleSkill(id: string): void {
    this.selectedSkillIds.update((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= MAX_SKILLS) return ids;
      return [...ids, id];
    });
  }

  protected removeSkill(id: string): void {
    this.selectedSkillIds.update((ids) => ids.filter((x) => x !== id));
  }

  protected onContinue(): void {
    void this.submit(true);
  }

  protected onSkip(): void {
    void this.submit(false);
  }

  protected goBackToExpertise(): void {
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/expertise`]);
  }

  private load(): void {
    this.loadingTaxonomy.set(true);
    this.errorMessage.set(null);

    this.profileApi
      .getDeveloperProfile()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (profile) => {
          const interests = profile?.interests ?? [];
          const catIds = interests.map((i) => i.id).filter(Boolean);
          this.categoryIds.set(catIds);

          const existingSpecialtyIds = interests
            .flatMap((i) => i.specialties ?? [])
            .map((s) => s.id)
            .filter(Boolean);
          const existingSkillIds = interests
            .flatMap((i) => i.specialties ?? [])
            .flatMap((s) => s.skills ?? [])
            .map((sk) => sk.id)
            .filter(Boolean);

          if (!catIds.length) {
            this.loadingTaxonomy.set(false);
            return;
          }

          forkJoin(catIds.map((id) => this.taxonomyApi.getSpecialtiesByCategory(id))).subscribe({
            next: (lists) => {
              const byId = new Map<string, TaxonomySpecialty>();
              for (const s of lists.flat()) byId.set(s.id, s);
              this.specialties.set([...byId.values()]);

              const validExisting = existingSpecialtyIds.filter((id) => byId.has(id));
              this.selectedSpecialtyIds.set(validExisting);
              this.selectedSkillIds.set([...new Set(existingSkillIds)]);
              this.loadingTaxonomy.set(false);

              if (validExisting.length) this.reloadSkills(validExisting);
            },
            error: (err) => {
              this.loadingTaxonomy.set(false);
              this.errorMessage.set(extractApiError(err, 'Could not load specialties.'));
            },
          });
        },
        error: (err) => {
          this.loadingTaxonomy.set(false);
          this.errorMessage.set(extractApiError(err, 'Could not load your profile.'));
        },
      });
  }

  private reloadSkills(specialtyIds: string[]): void {
    this.loadingSkills.set(true);
    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (skills) => {
        this.availableSkills.set(skills);
        const valid = new Set(skills.map((s) => s.id));
        this.selectedSkillIds.update((ids) => ids.filter((id) => valid.has(id)));
        this.loadingSkills.set(false);
      },
      error: (err) => {
        this.loadingSkills.set(false);
        this.errorMessage.set(extractApiError(err, 'Could not load skills.'));
      },
    });
  }

  private async submit(save: boolean): Promise<void> {
    if (this.loading()) return;
    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      if (save && this.selectedSpecialtyIds().length) {
        await firstValueFrom(
          this.profileApi.replaceDeveloperSpecialties(this.selectedSpecialtyIds()),
        );
        await firstValueFrom(this.profileApi.replaceDeveloperSkills(this.selectedSkillIds()));
      }
      await this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/complete`]);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err));
    }
  }
}
