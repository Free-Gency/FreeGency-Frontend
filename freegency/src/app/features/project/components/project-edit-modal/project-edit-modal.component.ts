import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TaxonomyApiService,
  type TaxonomySkill,
  type TaxonomySpecialty,
} from '../../../auth/data-access/taxonomy-api.service';
import { PROJECT_CURRENCIES } from '../../../auth/data-access/project-draft-state.service';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';
import { ProjectLookupsApiService } from '../../data-access/project-lookups-api.service';
import { ProjectDetail } from '../../models/project-detail';
import { UpdateProjectRequest } from '../../models/update-project-request';
import { CategoryOption } from '../../models/project-lookup';

const MAX_SKILLS = 10;

@Component({
  selector: 'app-project-edit-modal',
  imports: [FormsModule],
  templateUrl: './project-edit-modal.component.html',
  styleUrl: './project-edit-modal.component.css',
})
export class ProjectEditModalComponent {
  readonly project = input.required<ProjectDetail>();
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly saved = output<ProjectDetail>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly lookupsLoading = signal(false);
  protected readonly specialtiesLoading = signal(false);
  protected readonly skillsLoading = signal(false);

  protected readonly categories = signal<CategoryOption[]>([]);
  protected readonly specialties = signal<TaxonomySpecialty[]>([]);
  protected readonly availableSkills = signal<TaxonomySkill[]>([]);

  protected readonly selectedSpecialtyIds = signal<string[]>([]);
  protected readonly selectedSkillIds = signal<string[]>([]);
  protected readonly specialtySearch = signal('');
  protected readonly skillSearch = signal('');

  protected readonly currencies = PROJECT_CURRENCIES;
  protected readonly maxSkills = MAX_SKILLS;

  protected title = '';
  protected description = '';
  protected categoryId = '';
  protected isFixedPrice = true;
  protected budgetFixed: number | null = null;
  protected budgetMin: number | null = null;
  protected budgetMax: number | null = null;
  protected currency: string = 'USD';
  protected estimatedDurationDays: number | null = null;

  private categoriesLoaded = false;
  private lastSeededProjectId: string | null = null;

  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly lookupsApi = inject(ProjectLookupsApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly filteredSpecialties = computed(() => {
    const term = this.specialtySearch().trim().toLowerCase();
    const selected = new Set(this.selectedSpecialtyIds());
    return this.specialties().filter((s) => {
      if (selected.has(s.id)) return false;
      if (!term) return true;
      return this.specialtyLabel(s).toLowerCase().includes(term);
    });
  });

  protected readonly specialtySuggestions = computed(() =>
    this.specialtySearch().trim() ? this.filteredSpecialties().slice(0, 8) : [],
  );

  protected readonly selectedSpecialtiesList = computed(() => {
    const selected = new Set(this.selectedSpecialtyIds());
    return this.specialties().filter((s) => selected.has(s.id));
  });

  protected readonly selectedSkillsList = computed(() => {
    const byId = new Map(this.availableSkills().map((s) => [s.id, s]));
    return this.selectedSkillIds().map((id) => byId.get(id) ?? { id, name: id });
  });

  protected readonly skillSuggestions = computed(() => {
    const term = this.skillSearch().trim().toLowerCase();
    if (!term) return [];
    const selected = new Set(this.selectedSkillIds());
    return this.availableSkills()
      .filter((s) => !selected.has(s.id) && s.name.toLowerCase().includes(term))
      .slice(0, 8);
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.lastSeededProjectId = null;
        return;
      }

      const p = this.project();
      // Re-seed form when modal opens for a project (avoid resetting while typing)
      if (this.lastSeededProjectId === p.id) return;
      this.lastSeededProjectId = p.id;

      this.title = p.title;
      this.description = p.description;
      this.categoryId = p.categoryId;
      this.isFixedPrice = p.isFixedPrice;
      this.currency = this.normalizeCurrency(p.currency);
      this.estimatedDurationDays = p.estimatedDurationDays;
      this.error.set(null);
      this.specialtySearch.set('');
      this.skillSearch.set('');

      if (p.isFixedPrice) {
        this.budgetFixed = p.budgetMin ?? p.budgetMax;
        this.budgetMin = null;
        this.budgetMax = null;
      } else {
        this.budgetFixed = null;
        this.budgetMin = p.budgetMin;
        this.budgetMax = p.budgetMax;
      }

      this.selectedSkillIds.set([...p.skillIds]);

      if (!this.categoriesLoaded) {
        this.loadCategories(() => this.bootstrapTaxonomy(p));
      } else {
        this.bootstrapTaxonomy(p);
      }
    });
  }

  private normalizeCurrency(value: string): string {
    const upper = (value || 'USD').toUpperCase();
    return (this.currencies as readonly string[]).includes(upper) ? upper : 'USD';
  }

  private loadCategories(after?: () => void) {
    this.lookupsLoading.set(true);
    this.lookupsApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoaded = true;
        this.lookupsLoading.set(false);
        after?.();
      },
      error: () => {
        this.lookupsLoading.set(false);
        this.error.set('Failed to load categories.');
      },
    });
  }

  private bootstrapTaxonomy(p: ProjectDetail) {
    if (!p.categoryId) {
      this.specialties.set([]);
      this.availableSkills.set([]);
      this.selectedSpecialtyIds.set([]);
      return;
    }
    this.loadSpecialties(p.categoryId, p.specialties, p.skillIds);
  }

  protected specialtyLabel(s: TaxonomySpecialty): string {
    return s.nameEn?.trim() || s.nameAr?.trim() || 'Specialty';
  }

  protected onCategoryChange(id: string) {
    this.categoryId = id;
    this.selectedSpecialtyIds.set([]);
    this.selectedSkillIds.set([]);
    this.availableSkills.set([]);
    this.specialtySearch.set('');
    this.skillSearch.set('');
    if (id) {
      this.loadSpecialties(id);
    } else {
      this.specialties.set([]);
    }
  }

  private loadSpecialties(
    categoryId: string,
    specialtyNamesToMatch?: string[],
    skillIdsToKeep?: string[],
  ) {
    this.specialtiesLoading.set(true);
    this.taxonomyApi.getSpecialtiesByCategory(categoryId).subscribe({
      next: (list) => {
        this.specialties.set(list);
        this.specialtiesLoading.set(false);

        if (specialtyNamesToMatch?.length) {
          const matched = list
            .filter((s) => specialtyNamesToMatch.includes(s.nameEn) || specialtyNamesToMatch.includes(s.nameAr ?? ''))
            .map((s) => s.id);
          this.selectedSpecialtyIds.set(matched);
          this.reloadSkills(matched, skillIdsToKeep);
        } else if (this.selectedSpecialtyIds().length) {
          // Keep only specialties that still belong to this category
          const allowed = new Set(list.map((s) => s.id));
          const next = this.selectedSpecialtyIds().filter((id) => allowed.has(id));
          this.selectedSpecialtyIds.set(next);
          this.reloadSkills(next, skillIdsToKeep);
        } else {
          this.availableSkills.set([]);
        }
      },
      error: () => {
        this.specialtiesLoading.set(false);
        this.error.set('Failed to load specialties for this category.');
      },
    });
  }

  private reloadSkills(specialtyIds: string[], skillIdsToKeep?: string[]) {
    if (!specialtyIds.length) {
      this.availableSkills.set([]);
      this.selectedSkillIds.set([]);
      return;
    }

    this.skillsLoading.set(true);
    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (skills) => {
        this.availableSkills.set(skills);
        this.skillsLoading.set(false);
        const allowed = new Set(skills.map((s) => s.id));
        const keep = skillIdsToKeep ?? this.selectedSkillIds();
        this.selectedSkillIds.set(keep.filter((id) => allowed.has(id)));
      },
      error: () => {
        this.skillsLoading.set(false);
        this.error.set('Failed to load skills for selected specialties.');
      },
    });
  }

  protected setFixedPrice(value: boolean) {
    if (this.isFixedPrice === value) return;
    this.isFixedPrice = value;
    if (value) {
      this.budgetFixed = this.budgetMin ?? this.budgetMax;
      this.budgetMin = null;
      this.budgetMax = null;
    } else {
      this.budgetMin = this.budgetFixed;
      this.budgetMax = this.budgetFixed;
      this.budgetFixed = null;
    }
  }

  protected toggleSpecialty(id: string) {
    const next = this.selectedSpecialtyIds().includes(id)
      ? this.selectedSpecialtyIds().filter((x) => x !== id)
      : [...this.selectedSpecialtyIds(), id];
    this.selectedSpecialtyIds.set(next);
    this.specialtySearch.set('');
    this.reloadSkills(next);
  }

  protected addSpecialty(id: string) {
    if (!this.selectedSpecialtyIds().includes(id)) {
      this.toggleSpecialty(id);
    } else {
      this.specialtySearch.set('');
    }
  }

  protected toggleSkill(id: string) {
    if (this.selectedSkillIds().includes(id)) {
      this.selectedSkillIds.update((ids) => ids.filter((x) => x !== id));
      return;
    }
    if (this.selectedSkillIds().length >= MAX_SKILLS) return;
    this.selectedSkillIds.update((ids) => [...ids, id]);
    this.skillSearch.set('');
  }

  protected addSkill(id: string) {
    this.toggleSkill(id);
  }

  protected close() {
    this.closed.emit();
  }

  protected save() {
    if (!this.title.trim()) {
      this.error.set('Title is required.');
      return;
    }
    if (!this.categoryId) {
      this.error.set('Category is required.');
      return;
    }

    let budgetMin: number | undefined;
    let budgetMax: number | undefined;

    if (this.isFixedPrice) {
      const amount = this.budgetFixed;
      if (amount == null || Number.isNaN(amount) || amount < 0) {
        this.error.set('Enter a valid fixed budget.');
        return;
      }
      budgetMin = amount;
      budgetMax = amount;
    } else {
      if (this.budgetMin == null || this.budgetMax == null) {
        this.error.set('Enter a valid budget range.');
        return;
      }
      if (this.budgetMin < 0 || this.budgetMax < 0 || this.budgetMin > this.budgetMax) {
        this.error.set('Budget min must be less than or equal to budget max.');
        return;
      }
      budgetMin = this.budgetMin;
      budgetMax = this.budgetMax;
    }

    this.saving.set(true);
    this.error.set(null);

    const specialtyIds = this.selectedSpecialtyIds();
    const skillIds = this.selectedSkillIds();

    const request: UpdateProjectRequest = {
      id: this.project().id,
      title: this.title.trim(),
      description: this.description.trim(),
      categoryId: this.categoryId,
      isFixedPrice: this.isFixedPrice,
      budgetMin,
      budgetMax,
      currency: this.currency,
      estimatedDurationDays: this.estimatedDurationDays,
      specialtyIds,
      skillIds,
    };

    this.projectApi.update(request).subscribe({
      next: () => {
        this.saving.set(false);
        const p = this.project();
        const selectedCategory = this.categories().find((c) => c.id === this.categoryId);
        const specialtyNames = this.selectedSpecialtiesList().map((s) => this.specialtyLabel(s));
        const skillNames = this.selectedSkillsList().map((s) => s.name);

        const updated: ProjectDetail = {
          ...p,
          title: this.title.trim(),
          description: this.description.trim(),
          categoryId: this.categoryId,
          categoryName: selectedCategory?.nameEn ?? p.categoryName,
          isFixedPrice: this.isFixedPrice,
          budgetMin: budgetMin!,
          budgetMax: budgetMax!,
          currency: this.currency,
          estimatedDurationDays: this.estimatedDurationDays,
          specialties: specialtyNames,
          skills: skillNames,
          skillIds,
        };
        this.saved.emit(updated);
        this.closed.emit();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to update project.');
        this.saving.set(false);
      },
    });
  }
}
