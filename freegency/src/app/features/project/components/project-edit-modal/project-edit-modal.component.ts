import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';
import { ProjectLookupsApiService } from '../../data-access/project-lookups-api.service';
import { ProjectDetail } from '../../models/project-detail';
import { UpdateProjectRequest } from '../../models/update-project-request';
import { CategoryOption, SkillOption, SpecialtyOption } from '../../models/project-lookup';

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
  protected readonly categories = signal<CategoryOption[]>([]);
  protected readonly specialties = signal<SpecialtyOption[]>([]);
  protected readonly skills = signal<SkillOption[]>([]);
  private lookupsLoaded = false;

  protected title = '';
  protected description = '';
  protected categoryId = '';
  protected isFixedPrice = true;
  protected budgetMin: number | null = null;
  protected budgetMax: number | null = null;
  protected currency = '';
  protected estimatedDurationDays: number | null = null;
  protected selectedSpecialtyIds = new Set<string>();
  protected selectedSkillIds = new Set<string>();

  protected readonly skillSearch = signal('');
  protected readonly specialtySearch = signal('');

  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly lookupsApi = inject(ProjectLookupsApiService);

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;

      const p = this.project();
      this.title = p.title;
      this.description = p.description;
      this.categoryId = p.categoryId;
      this.isFixedPrice = p.isFixedPrice;
      this.budgetMin = p.budgetMin;
      this.budgetMax = p.budgetMax;
      this.currency = p.currency;
      this.estimatedDurationDays = p.estimatedDurationDays;
      this.selectedSkillIds = new Set(p.skillIds);
      this.skillSearch.set('');
      this.specialtySearch.set('');
      this.error.set(null);

      if (!this.lookupsLoaded) {
        this.loadLookups(p.specialties);
      } else {
        this.preselectSpecialtiesByName(p.specialties);
      }
    });
  }

  private loadLookups(currentSpecialtyNames: string[]) {
    this.lookupsLoading.set(true);

    this.lookupsApi.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });

    this.lookupsApi.getSkills().subscribe({
      next: (skills) => this.skills.set(skills),
      error: () => {},
    });

    this.lookupsApi.getSpecialties().subscribe({
      next: (specialties) => {
        this.specialties.set(specialties);
        this.lookupsLoaded = true;
        this.lookupsLoading.set(false);
        this.preselectSpecialtiesByName(currentSpecialtyNames);
      },
      error: () => {
        this.lookupsLoading.set(false);
      },
    });
  }

  // ProjectDetail only exposes specialty names (not ids), so we match by
  // name against the fetched lookup list to know which chips start selected.
  // Specialties only carry nameEn/nameAr (no plain `name`) — match on nameEn
  // since that's the language ProjectDetail.specialties comes back in.
  private preselectSpecialtiesByName(names: string[]) {
    const matched = this.specialties()
      .filter((s) => names.includes(s.nameEn))
      .map((s) => s.id);
    this.selectedSpecialtyIds = new Set(matched);
  }

  protected toggleSpecialty(id: string) {
    const next = new Set(this.selectedSpecialtyIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedSpecialtyIds = next;
  }

  protected toggleSkill(id: string) {
    const next = new Set(this.selectedSkillIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedSkillIds = next;
  }

  // Lists actually rendered as chips — kept small (only the selection),
  // instead of dumping the full 60-150 option lists on screen.
  protected selectedSkillsList(): SkillOption[] {
    return this.skills().filter((s) => this.selectedSkillIds.has(s.id));
  }

  protected selectedSpecialtiesList(): SpecialtyOption[] {
    return this.specialties().filter((s) => this.selectedSpecialtyIds.has(s.id));
  }

  protected skillSuggestions(): SkillOption[] {
    const term = this.skillSearch().trim().toLowerCase();
    if (!term) return [];
    return this.skills()
      .filter((s) => !this.selectedSkillIds.has(s.id) && s.name.toLowerCase().includes(term))
      .slice(0, 8);
  }

  protected specialtySuggestions(): SpecialtyOption[] {
    const term = this.specialtySearch().trim().toLowerCase();
    if (!term) return [];
    return this.specialties()
      .filter((s) => !this.selectedSpecialtyIds.has(s.id) && s.nameEn.toLowerCase().includes(term))
      .slice(0, 8);
  }

  protected addSkill(id: string) {
    this.toggleSkill(id);
    this.skillSearch.set('');
  }

  protected addSpecialty(id: string) {
    this.toggleSpecialty(id);
    this.specialtySearch.set('');
  }

  protected close() {
    this.closed.emit();
  }

  protected save() {
    this.saving.set(true);
    this.error.set(null);

    const request: UpdateProjectRequest = {
      id: this.project().id,
      title: this.title,
      description: this.description,
      categoryId: this.categoryId || undefined,
      isFixedPrice: this.isFixedPrice,
      budgetMin: this.budgetMin ?? undefined,
      budgetMax: this.budgetMax ?? undefined,
      currency: this.currency || undefined,
      estimatedDurationDays: this.estimatedDurationDays,
      specialtyIds: Array.from(this.selectedSpecialtyIds),
      skillIds: Array.from(this.selectedSkillIds),
    };

    this.projectApi.update(request).subscribe({
      next: () => {
        this.saving.set(false);
        const p = this.project();
        const selectedCategory = this.categories().find((c) => c.id === this.categoryId);
        const selectedSpecialtyNames = this.specialties()
          .filter((s) => this.selectedSpecialtyIds.has(s.id))
          .map((s) => s.nameEn);
        const selectedSkillNames = this.skills()
          .filter((s) => this.selectedSkillIds.has(s.id))
          .map((s) => s.name);

        const updated: ProjectDetail = {
          ...p,
          title: this.title,
          description: this.description,
          categoryId: this.categoryId || p.categoryId,
          categoryName: selectedCategory?.nameEn ?? p.categoryName,
          isFixedPrice: this.isFixedPrice,
          budgetMin: this.budgetMin ?? p.budgetMin,
          budgetMax: this.budgetMax ?? p.budgetMax,
          currency: this.currency || p.currency,
          estimatedDurationDays: this.estimatedDurationDays,
          specialties: selectedSpecialtyNames.length ? selectedSpecialtyNames : p.specialties,
          skills: selectedSkillNames.length ? selectedSkillNames : p.skills,
          skillIds: Array.from(this.selectedSkillIds),
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