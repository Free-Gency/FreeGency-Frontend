import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Calendar03Icon,
  Cancel01Icon,
  CloudUploadIcon,
  ColorsIcon,
  Delete02Icon,
  Edit02Icon,
  File01Icon,
  Image01Icon,
  Money01Icon,
  Pdf02Icon,
  SecurityCheckIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { CLIENT_HOME_PATH, CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { CategoriesApiService, type CategoryDto } from '../../data-access/categories-api.service';
import { ProjectFilesApiService } from '../../data-access/project-files-api.service';
import {
  PROJECT_CURRENCIES,
  PROJECT_DURATIONS,
  ProjectDraftStateService,
  durationToDays,
} from '../../data-access/project-draft-state.service';
import {
  ProjectsApiService,
  type CreateProjectRequest,
} from '../../data-access/projects-api.service';
import {
  TaxonomyApiService,
  type TaxonomySkill,
  type TaxonomySpecialty,
} from '../../data-access/taxonomy-api.service';
import {
  createProjectBasePath,
  isOnboardingCreateFlow,
} from '../../utils/create-project-paths';
import { firstValueFrom } from 'rxjs';

const MAX_ASSET_BYTES = 50 * 1024 * 1024;

export type OverviewEditField =
  'draft' | 'category' | 'budget' | 'specialty' | 'timeline' | 'skills';

export interface OverviewDetailCard {
  label: string;
  value: string;
  icon: IconSvgObject;
  field: Exclude<OverviewEditField, 'draft' | 'skills'>;
  underline?: boolean;
}

export interface OverviewAsset {
  id: string;
  name: string;
  size: string;
  kind: 'pdf' | 'image' | 'doc';
  file: File;
}

@Component({
  selector: 'app-client-project-overview',
  imports: [FormsModule, HugeiconsIconComponent, StepFooterActionsComponent],
  templateUrl: './client-project-overview.component.html',
  styleUrl: './client-project-overview.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientProjectOverviewComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly draftState = inject(ProjectDraftStateService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly projectFilesApi = inject(ProjectFilesApiService);
  private readonly toast = inject(ToastService);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;
  protected readonly editIcon = Edit02Icon as IconSvgObject;
  protected readonly uploadIcon = CloudUploadIcon as IconSvgObject;
  protected readonly deleteIcon = Delete02Icon as IconSvgObject;
  protected readonly pdfIcon = Pdf02Icon as IconSvgObject;
  protected readonly imageIcon = Image01Icon as IconSvgObject;
  protected readonly docIcon = File01Icon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  protected readonly currentStep = computed(() => (this.draftState.mode() === 'manual' ? 4 : 3));
  protected readonly progressSteps = computed(() =>
    this.draftState.mode() === 'manual' ? [1, 2, 3, 4] : [1, 2, 3],
  );
  protected readonly showStepProgress = !isOnboardingCreateFlow(this.router);
  protected readonly currencies = PROJECT_CURRENCIES;
  protected readonly durations = PROJECT_DURATIONS;
  protected readonly assets = signal<OverviewAsset[]>([]);
  protected readonly submitting = signal(false);

  protected readonly draft = this.draftState.draft;
  protected readonly scope = this.draftState.scope;

  protected readonly editField = signal<OverviewEditField | null>(null);
  protected readonly editLoading = signal(false);
  protected readonly editError = signal('');

  protected readonly editTitle = signal('');
  protected readonly editDescription = signal('');

  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly editCategoryId = signal<string | null>(null);

  protected readonly editIsFixedPrice = signal(true);
  protected readonly editBudgetFixed = signal('');
  protected readonly editBudgetMin = signal('');
  protected readonly editBudgetMax = signal('');
  protected readonly editCurrency = signal('USD');

  protected readonly availableSpecialties = signal<TaxonomySpecialty[]>([]);
  protected readonly editSpecialtyIds = signal<string[]>([]);

  protected readonly editDuration = signal('1-3 months');

  protected readonly availableSkills = signal<TaxonomySkill[]>([]);
  protected readonly editSkillIds = signal<string[]>([]);

  protected readonly projectTitle = computed(
    () => this.draft()?.title?.trim() || 'Untitled project',
  );

  protected readonly projectParagraphs = computed(() => {
    const description = this.draft()?.description?.trim() ?? '';
    if (!description) return ['No description generated yet.'];

    const parts = description
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length > 0 ? parts : [description];
  });

  protected readonly skills = computed(() => this.draft()?.skillNames ?? []);

  protected readonly detailCards = computed<OverviewDetailCard[]>(() => {
    const draft = this.draft();
    const scope = this.scope();
    const specialtyCount = draft?.specialtyNames?.length ?? draft?.specialtyIds?.length ?? 0;

    return [
      {
        label: 'Category',
        value: draft?.categoryName?.trim() || '—',
        icon: ColorsIcon as IconSvgObject,
        field: 'category',
      },
      {
        label: 'Budget',
        value: this.draftState.budgetLabel(),
        icon: Money01Icon as IconSvgObject,
        field: 'budget',
      },
      {
        label: 'Specialty',
        value: specialtyCount > 0 ? `+${specialtyCount}` : '—',
        icon: SecurityCheckIcon as IconSvgObject,
        field: 'specialty',
        underline: specialtyCount > 0,
      },
      {
        label: 'Timeline',
        value: scope?.duration?.trim() || '—',
        icon: Calendar03Icon as IconSvgObject,
        field: 'timeline',
      },
    ];
  });

  protected readonly editDialogTitle = computed(() => {
    switch (this.editField()) {
      case 'draft':
        return 'Edit project draft';
      case 'category':
        return 'Edit category';
      case 'budget':
        return 'Edit budget';
      case 'specialty':
        return 'Edit specialties';
      case 'timeline':
        return 'Edit timeline';
      case 'skills':
        return 'Edit skills';
      default:
        return 'Edit';
    }
  });

  protected readonly canSaveEdit = computed(() => {
    const field = this.editField();
    if (!field || this.editLoading()) return false;

    switch (field) {
      case 'draft':
        return this.editTitle().trim().length > 0 && this.editDescription().trim().length > 0;
      case 'category':
        return !!this.editCategoryId();
      case 'budget':
        return this.isBudgetValid();
      case 'specialty':
        return this.editSpecialtyIds().length > 0;
      case 'timeline':
        return !!this.editDuration().trim();
      case 'skills':
        return this.editSkillIds().length > 0;
      default:
        return false;
    }
  });

  ngOnInit(): void {
    if (!this.draftState.hasDraft()) {
      const start =
        this.draftState.mode() === 'manual'
          ? `${createProjectBasePath(this.router)}/manual`
          : `${createProjectBasePath(this.router)}/with-ai`;
      void this.router.navigate([start]);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.editField()) this.closeEdit();
  }

  protected assetIcon(kind: OverviewAsset['kind']): IconSvgObject {
    if (kind === 'pdf') return this.pdfIcon;
    if (kind === 'image') return this.imageIcon;
    return this.docIcon;
  }

  protected onRemoveAsset(id: string): void {
    this.assets.update((list) => list.filter((item) => item.id !== id));
  }

  protected onBrowseFiles(input: HTMLInputElement): void {
    input.click();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const next: OverviewAsset[] = [];
    for (const [index, file] of files.entries()) {
      if (file.size > MAX_ASSET_BYTES) {
        this.toast.error(`"${file.name}" exceeds the 50MB limit.`);
        continue;
      }

      const lower = file.name.toLowerCase();
      let kind: OverviewAsset['kind'] = 'doc';
      if (lower.endsWith('.pdf')) kind = 'pdf';
      else if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) kind = 'image';

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      next.push({
        id: `${Date.now()}-${index}`,
        name: file.name,
        size: `${sizeMb} MB`,
        kind,
        file,
      });
    }

    if (next.length) {
      this.assets.update((list) => [...list, ...next]);
    }
    input.value = '';
  }

  protected openEdit(field: OverviewEditField): void {
    const draft = this.draft();
    if (!draft) return;

    this.editError.set('');
    this.editField.set(field);

    switch (field) {
      case 'draft':
        this.editTitle.set(draft.title ?? '');
        this.editDescription.set(draft.description ?? '');
        break;
      case 'category':
        this.editCategoryId.set(draft.categoryId);
        this.loadCategories();
        break;
      case 'budget': {
        const scope = this.scope();
        this.editIsFixedPrice.set(scope?.isFixedPrice ?? true);
        this.editBudgetFixed.set(scope?.budgetFixed ?? '');
        this.editBudgetMin.set(scope?.budgetMin ?? '');
        this.editBudgetMax.set(scope?.budgetMax ?? '');
        this.editCurrency.set(scope?.currency ?? 'USD');
        break;
      }
      case 'specialty':
        this.editSpecialtyIds.set([...(draft.specialtyIds ?? [])]);
        this.loadSpecialtiesForCategory(draft.categoryId);
        break;
      case 'timeline':
        this.editDuration.set(this.scope()?.duration ?? '1-3 months');
        break;
      case 'skills':
        this.editSkillIds.set([...(draft.skillIds ?? [])]);
        this.loadRelatedSkills(draft.specialtyIds ?? []);
        break;
    }
  }

  protected closeEdit(): void {
    this.editField.set(null);
    this.editError.set('');
    this.editLoading.set(false);
  }

  protected setEditFixedPrice(fixed: boolean): void {
    this.editIsFixedPrice.set(fixed);
  }

  protected toggleSpecialty(id: string): void {
    this.editSpecialtyIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  protected isSpecialtySelected(id: string): boolean {
    return this.editSpecialtyIds().includes(id);
  }

  protected toggleSkill(id: string): void {
    this.editSkillIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  protected isSkillSelected(id: string): boolean {
    return this.editSkillIds().includes(id);
  }

  protected specialtyLabel(item: TaxonomySpecialty): string {
    return item.nameEn?.trim() || item.nameAr?.trim() || 'Specialty';
  }

  protected categoryLabel(item: CategoryDto): string {
    return item.nameEn?.trim() || item.name?.trim() || 'Category';
  }

  protected saveEdit(): void {
    const field = this.editField();
    if (!field || !this.canSaveEdit()) return;

    switch (field) {
      case 'draft':
        this.draftState.patchDraft({
          title: this.editTitle().trim(),
          description: this.editDescription().trim(),
        });
        this.closeEdit();
        break;
      case 'category':
        this.saveCategory();
        break;
      case 'budget':
        this.draftState.patchScope({
          isFixedPrice: this.editIsFixedPrice(),
          budgetFixed: this.editBudgetFixed().trim(),
          budgetMin: this.editBudgetMin().trim(),
          budgetMax: this.editBudgetMax().trim(),
          currency: this.editCurrency(),
        });
        this.closeEdit();
        break;
      case 'specialty':
        this.saveSpecialties();
        break;
      case 'timeline':
        this.draftState.patchScope({ duration: this.editDuration() });
        this.closeEdit();
        break;
      case 'skills':
        this.saveSkills();
        break;
    }
  }

  protected onBack(): void {
    const base = createProjectBasePath(this.router);
    const scope =
      this.draftState.mode() === 'manual'
        ? `${base}/manual/scope`
        : `${base}/with-ai/scope`;
    void this.router.navigate([scope]);
  }

  protected onSaveDraft(): void {
    void this.submitProject(false);
  }

  protected onPostJob(): void {
    void this.submitProject(true);
  }

  private async submitProject(publish: boolean): Promise<void> {
    if (this.submitting()) return;

    const request = this.buildCreateRequest();
    if (!request) return;

    this.submitting.set(true);

    try {
      const projectId = await firstValueFrom(this.projectsApi.create(request));

      const files = this.assets().map((asset) => asset.file);
      if (files.length) {
        await firstValueFrom(this.projectFilesApi.upload(projectId, files));
      }

      if (publish) {
        await firstValueFrom(this.projectsApi.publish(projectId));
      }

      this.draftState.clear();
      this.assets.set([]);

      this.toast.success(
        publish
          ? 'Your job has been posted successfully!'
          : 'Your project has been saved as a draft.',
      );

      const nextPath = isOnboardingCreateFlow(this.router)
        ? `${CLIENT_ONBOARDING_PATH}/complete`
        : CLIENT_HOME_PATH;
      await this.router.navigateByUrl(nextPath);
    } catch (err) {
      this.toast.error(
        extractApiError(
          err,
          publish
            ? 'Could not post this job. Please review the details and try again.'
            : 'Could not save the draft. Please review the details and try again.',
        ),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private buildCreateRequest(): CreateProjectRequest | null {
    const draft = this.draft();
    const scope = this.scope();

    if (!draft?.categoryId) {
      this.toast.error('Please select a category before continuing.');
      return null;
    }
    if (!draft.specialtyIds?.length) {
      this.toast.error('Please select at least one specialty.');
      return null;
    }
    if (!draft.skillIds?.length) {
      this.toast.error('Please select at least one skill.');
      return null;
    }
    if (!scope) {
      this.toast.error('Please set the project budget and timeline.');
      return null;
    }

    let budgetMin: number;
    let budgetMax: number;

    if (scope.isFixedPrice) {
      const amount = Number(scope.budgetFixed);
      if (!Number.isFinite(amount) || amount <= 0) {
        this.toast.error('Please set a valid fixed budget.');
        return null;
      }
      budgetMin = amount;
      budgetMax = amount;
    } else {
      budgetMin = Number(scope.budgetMin);
      budgetMax = Number(scope.budgetMax);
      if (
        !Number.isFinite(budgetMin) ||
        !Number.isFinite(budgetMax) ||
        budgetMin <= 0 ||
        budgetMax < budgetMin
      ) {
        this.toast.error('Please set a valid budget range.');
        return null;
      }
    }

    const title = draft.title?.trim();
    const description = draft.description?.trim();
    if (!title || !description) {
      this.toast.error('Title and description are required.');
      return null;
    }

    return {
      title,
      description,
      categoryId: draft.categoryId,
      isFixedPrice: scope.isFixedPrice,
      budgetMin,
      budgetMax,
      currency: scope.currency || 'USD',
      estimatedDurationDays: durationToDays(scope.duration),
      skillIds: draft.skillIds,
      specialtyIds: draft.specialtyIds,
    };
  }

  private isBudgetValid(): boolean {
    if (this.editIsFixedPrice()) {
      const amount = Number(this.editBudgetFixed());
      return Number.isFinite(amount) && amount > 0;
    }

    const min = Number(this.editBudgetMin());
    const max = Number(this.editBudgetMax());
    return Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0 && max >= min;
  }

  private loadCategories(): void {
    this.editLoading.set(true);
    this.editError.set('');
    this.categoriesApi.getCategories().subscribe({
      next: (items) => {
        this.categories.set(items);
        this.editLoading.set(false);
      },
      error: () => {
        this.editError.set('Could not load categories. Please try again.');
        this.editLoading.set(false);
      },
    });
  }

  private loadSpecialtiesForCategory(categoryId: string | null): void {
    if (!categoryId) {
      this.availableSpecialties.set([]);
      this.editError.set('Select a category first, then edit specialties.');
      return;
    }

    this.editLoading.set(true);
    this.editError.set('');
    this.taxonomyApi.getSpecialtiesByCategory(categoryId).subscribe({
      next: (items) => {
        this.availableSpecialties.set(items);
        this.editLoading.set(false);
      },
      error: () => {
        this.editError.set('Could not load specialties. Please try again.');
        this.editLoading.set(false);
      },
    });
  }

  private loadRelatedSkills(specialtyIds: string[]): void {
    if (!specialtyIds.length) {
      this.availableSkills.set([]);
      this.editError.set('Select at least one specialty first, then edit skills.');
      return;
    }

    this.editLoading.set(true);
    this.editError.set('');
    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (items) => {
        this.availableSkills.set(items);
        const allowed = new Set(items.map((skill) => skill.id));
        this.editSkillIds.update((ids) => ids.filter((id) => allowed.has(id)));
        this.editLoading.set(false);
      },
      error: () => {
        this.editError.set('Could not load related skills. Please try again.');
        this.editLoading.set(false);
      },
    });
  }

  private saveCategory(): void {
    const categoryId = this.editCategoryId();
    const category = this.categories().find((c) => c.id === categoryId);
    if (!categoryId || !category) return;

    const previousId = this.draft()?.categoryId;
    this.draftState.patchDraft({
      categoryId,
      categoryName: this.categoryLabel(category),
      needsManualCategoryReview: false,
      ...(previousId !== categoryId
        ? { specialtyIds: [], specialtyNames: [], skillIds: [], skillNames: [] }
        : {}),
    });

    this.closeEdit();
  }

  private saveSpecialties(): void {
    const selectedIds = this.editSpecialtyIds();
    const selected = this.availableSpecialties().filter((s) => selectedIds.includes(s.id));
    const previous = this.draft()?.specialtyIds ?? [];
    const changed =
      previous.length !== selectedIds.length || selectedIds.some((id) => !previous.includes(id));

    this.draftState.patchDraft({
      specialtyIds: selected.map((s) => s.id),
      specialtyNames: selected.map((s) => this.specialtyLabel(s)),
      ...(changed ? { skillIds: [], skillNames: [] } : {}),
    });
    this.closeEdit();
  }

  private saveSkills(): void {
    const selectedIds = this.editSkillIds();
    const selected = this.availableSkills().filter((s) => selectedIds.includes(s.id));

    this.draftState.patchDraft({
      skillIds: selected.map((s) => s.id),
      skillNames: selected.map((s) => s.name),
    });
    this.closeEdit();
  }
}
