import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ApiIcon,
  ArtificialIntelligence01Icon,
  Bug01Icon,
  Cancel01Icon,
  CloudServerIcon,
  LaptopProgrammingIcon,
  MicrochipIcon,
  MobileProgramming01Icon,
  PenToolIcon,
  Search01Icon,
  SecurityLockIcon,
  ShoppingCart01Icon,
  SourceCodeIcon,
} from '@hugeicons/core-free-icons';
import { extractApiError } from '../../../../core/http/api-error';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { CategoriesApiService, type CategoryDto } from '../../data-access/categories-api.service';
import { ProjectDraftStateService } from '../../data-access/project-draft-state.service';
import {
  TaxonomyApiService,
  type TaxonomySkill,
  type TaxonomySpecialty,
} from '../../data-access/taxonomy-api.service';
import { createProjectBasePath, isOnboardingCreateFlow } from '../../utils/create-project-paths';

const MAX_SKILLS = 10;

interface CategoryCard {
  id: string;
  label: string;
  icon: IconSvgObject;
}

const ICON_RULES: { match: string; icon: IconSvgObject }[] = [
  { match: 'ui', icon: PenToolIcon as IconSvgObject },
  { match: 'ux', icon: PenToolIcon as IconSvgObject },
  { match: 'design', icon: PenToolIcon as IconSvgObject },
  { match: 'web', icon: LaptopProgrammingIcon as IconSvgObject },
  { match: 'mobile', icon: MobileProgramming01Icon as IconSvgObject },
  { match: 'saas', icon: MicrochipIcon as IconSvgObject },
  { match: 'backend', icon: ApiIcon as IconSvgObject },
  { match: 'devops', icon: CloudServerIcon as IconSvgObject },
  { match: 'cloud', icon: CloudServerIcon as IconSvgObject },
  { match: 'qa', icon: Bug01Icon as IconSvgObject },
  { match: 'test', icon: Bug01Icon as IconSvgObject },
  { match: 'ai', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'machine', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'data', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'security', icon: SecurityLockIcon as IconSvgObject },
  { match: 'cyber', icon: SecurityLockIcon as IconSvgObject },
  { match: 'commerce', icon: ShoppingCart01Icon as IconSvgObject },
];

function iconFor(name: string): IconSvgObject {
  const key = name.toLowerCase();
  return (
    ICON_RULES.find((rule) => key.includes(rule.match))?.icon ??
    (SourceCodeIcon as IconSvgObject)
  );
}

@Component({
  selector: 'app-client-create-project-manual-taxonomy',
  imports: [FormsModule, HugeiconsIconComponent, StepFooterActionsComponent],
  templateUrl: './client-create-project-manual-taxonomy.component.html',
  styleUrl: './client-create-project-manual-taxonomy.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientCreateProjectManualTaxonomyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly draftState = inject(ProjectDraftStateService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;
  protected readonly maxSkills = MAX_SKILLS;
  protected readonly currentStep = 2;
  protected readonly totalSteps = [1, 2, 3, 4] as const;
  protected readonly showStepProgress = !isOnboardingCreateFlow(this.router);

  protected readonly categories = signal<CategoryCard[]>([]);
  protected readonly categoryQuery = signal('');
  protected readonly selectedCategoryId = signal<string | null>(null);

  protected readonly specialties = signal<TaxonomySpecialty[]>([]);
  protected readonly specialtyQuery = signal('');
  protected readonly selectedSpecialtyIds = signal<string[]>([]);

  protected readonly availableSkills = signal<TaxonomySkill[]>([]);
  protected readonly selectedSkillIds = signal<string[]>([]);

  protected readonly loadingCategories = signal(true);
  protected readonly loadingSpecialties = signal(false);
  protected readonly loadingSkills = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly filteredCategories = computed(() => {
    const q = this.categoryQuery().trim().toLowerCase();
    const list = this.categories();
    if (!q) return list;
    return list.filter((c) => c.label.toLowerCase().includes(q));
  });

  protected readonly filteredSpecialties = computed(() => {
    const q = this.specialtyQuery().trim().toLowerCase();
    const list = this.specialties();
    if (!q) return list;
    return list.filter((s) => this.specialtyLabel(s).toLowerCase().includes(q));
  });

  protected readonly popularSkills = computed(() => {
    const selected = new Set(this.selectedSkillIds());
    return this.availableSkills()
      .filter((s) => !selected.has(s.id))
      .slice(0, 12);
  });

  protected readonly selectedSkills = computed(() => {
    const byId = new Map(this.availableSkills().map((s) => [s.id, s]));
    const draft = this.draftState.draft();
    return this.selectedSkillIds().map((id) => {
      const fromApi = byId.get(id);
      if (fromApi) return fromApi;
      const draftIndex = draft?.skillIds?.indexOf(id) ?? -1;
      const name =
        draftIndex >= 0 ? (draft?.skillNames?.[draftIndex] ?? id) : id;
      return { id, name } satisfies TaxonomySkill;
    });
  });

  protected readonly canContinue = computed(
    () =>
      !!this.selectedCategoryId() &&
      this.selectedSpecialtyIds().length > 0 &&
      this.selectedSkillIds().length > 0 &&
      !this.loadingCategories() &&
      !this.loadingSpecialties() &&
      !this.loadingSkills(),
  );

  ngOnInit(): void {
    if (!this.draftState.hasDraft()) {
      void this.router.navigate([`${createProjectBasePath(this.router)}/manual`]);
      return;
    }

    this.draftState.setMode('manual');
    const draft = this.draftState.draft();
    if (draft?.categoryId) this.selectedCategoryId.set(draft.categoryId);
    if (draft?.specialtyIds?.length) this.selectedSpecialtyIds.set([...draft.specialtyIds]);
    if (draft?.skillIds?.length) this.selectedSkillIds.set([...draft.skillIds]);

    this.loadCategories();
  }

  protected specialtyLabel(item: TaxonomySpecialty): string {
    return item.nameEn?.trim() || item.nameAr?.trim() || 'Specialty';
  }

  protected isCategorySelected(id: string): boolean {
    return this.selectedCategoryId() === id;
  }

  protected isSpecialtySelected(id: string): boolean {
    return this.selectedSpecialtyIds().includes(id);
  }

  protected selectCategory(id: string): void {
    if (this.selectedCategoryId() === id) return;
    this.selectedCategoryId.set(id);
    this.selectedSpecialtyIds.set([]);
    this.selectedSkillIds.set([]);
    this.specialties.set([]);
    this.availableSkills.set([]);
    this.specialtyQuery.set('');
    this.loadSpecialties(id);
  }

  protected toggleSpecialty(id: string): void {
    this.selectedSpecialtyIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    this.reloadSkillsForSelectedSpecialties();
  }

  protected toggleSkill(id: string): void {
    if (this.selectedSkillIds().includes(id)) {
      this.selectedSkillIds.update((ids) => ids.filter((x) => x !== id));
      return;
    }
    if (this.selectedSkillIds().length >= MAX_SKILLS) return;
    this.selectedSkillIds.update((ids) => [...ids, id]);
  }

  protected removeSkill(id: string): void {
    this.selectedSkillIds.update((ids) => ids.filter((x) => x !== id));
  }

  protected onBack(): void {
    void this.router.navigate([`${createProjectBasePath(this.router)}/manual`]);
  }

  protected onContinue(): void {
    if (!this.canContinue()) return;

    const draft = this.draftState.draft();
    if (!draft) return;

    const categoryId = this.selectedCategoryId()!;
    const category = this.categories().find((c) => c.id === categoryId);
    const specialtyIds = this.selectedSpecialtyIds();
    const specialtyNames = this.specialties()
      .filter((s) => specialtyIds.includes(s.id))
      .map((s) => this.specialtyLabel(s));
    const skillIds = this.selectedSkillIds();
    const skillNames = this.selectedSkills().map((s) => s.name);

    this.draftState.patchDraft({
      categoryId,
      categoryName: category?.label ?? draft.categoryName,
      needsManualCategoryReview: false,
      specialtyIds,
      specialtyNames,
      skillIds,
      skillNames,
    });

    void this.router.navigate([`${createProjectBasePath(this.router)}/manual/scope`]);
  }

  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.errorMessage.set(null);

    this.categoriesApi.getCategories().subscribe({
      next: (items) => {
        this.categories.set(
          items.map(
            (c: CategoryDto): CategoryCard => ({
              id: c.id,
              label: c.nameEn || c.name,
              icon: iconFor(c.nameEn || c.name),
            }),
          ),
        );
        this.loadingCategories.set(false);

        const selected = this.selectedCategoryId();
        if (selected) this.loadSpecialties(selected);
      },
      error: (err) => {
        this.loadingCategories.set(false);
        this.errorMessage.set(extractApiError(err, 'Could not load categories.'));
      },
    });
  }

  private loadSpecialties(categoryId: string): void {
    this.loadingSpecialties.set(true);
    this.errorMessage.set(null);

    this.taxonomyApi.getSpecialtiesByCategory(categoryId).subscribe({
      next: (items) => {
        this.specialties.set(items);
        // Keep only specialties that still belong to this category.
        const allowed = new Set(items.map((s) => s.id));
        this.selectedSpecialtyIds.update((ids) => ids.filter((id) => allowed.has(id)));
        this.loadingSpecialties.set(false);
        this.reloadSkillsForSelectedSpecialties();
      },
      error: (err) => {
        this.loadingSpecialties.set(false);
        this.errorMessage.set(extractApiError(err, 'Could not load specialties.'));
      },
    });
  }

  private reloadSkillsForSelectedSpecialties(): void {
    const specialtyIds = this.selectedSpecialtyIds();
    if (!specialtyIds.length) {
      this.availableSkills.set([]);
      this.selectedSkillIds.set([]);
      return;
    }

    this.loadingSkills.set(true);
    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (items) => {
        this.availableSkills.set(items);
        const allowed = new Set(items.map((s) => s.id));
        this.selectedSkillIds.update((ids) => ids.filter((id) => allowed.has(id)));
        this.loadingSkills.set(false);
      },
      error: (err) => {
        this.loadingSkills.set(false);
        this.errorMessage.set(extractApiError(err, 'Could not load skills.'));
      },
    });
  }
}
