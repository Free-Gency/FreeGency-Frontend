import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ApiIcon,
  ArrowLeft01Icon,
  ArtificialIntelligence01Icon,
  Bug01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CloudServerIcon,
  Copy01Icon,
  LaptopProgrammingIcon,
  MicrochipIcon,
  MobileProgramming01Icon,
  PenToolIcon,
  Search01Icon,
  SecurityLockIcon,
  ShoppingCart01Icon,
  SourceCodeIcon,
  Tick02Icon,
  Upload04Icon,
} from '@hugeicons/core-free-icons';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthAmbientBgComponent } from '../../../auth/components/auth-ambient-bg/auth-ambient-bg.component';
import { CategoriesApiService } from '../../../auth/data-access/categories-api.service';
import { TaxonomyApiService } from '../../../auth/data-access/taxonomy-api.service';
import { StepFooterActionsComponent } from '../../../../shared/components/step-footer-actions/step-footer-actions.component';
import { TeamsService } from '../../data-access/teams.service';
import {
  TeamCardPreviewComponent,
  type TeamCardPreviewModel,
} from '../../components/team-card-preview/team-card-preview.component';

type WizardStep = 1 | 2 | 3 | 4 | 5;
type WizardPhase = 'form' | 'success';

interface CategoryOptionVm {
  id: string;
  label: string;
  icon: IconSvgObject;
}

interface ChipOption {
  id: string;
  label: string;
}

interface DraftPayload {
  step: WizardStep;
  name: string;
  aboutUs: string;
  selectedCategoryIds: string[];
  primaryCategoryId: string | null;
  selectedSkillIds: string[];
  selectedSpecialtyIds: string[];
}

const DRAFT_KEY = 'freegency.createTeamDraft';
const TOUR_DONE_KEY = 'freegency.createTeamTour.done';
const ABOUT_MAX = 2000;

const ICON_RULES: { match: string; icon: IconSvgObject }[] = [
  { match: 'ui', icon: PenToolIcon as IconSvgObject },
  { match: 'ux', icon: PenToolIcon as IconSvgObject },
  { match: 'web', icon: LaptopProgrammingIcon as IconSvgObject },
  { match: 'mobile', icon: MobileProgramming01Icon as IconSvgObject },
  { match: 'saas', icon: MicrochipIcon as IconSvgObject },
  { match: 'backend', icon: ApiIcon as IconSvgObject },
  { match: 'devops', icon: CloudServerIcon as IconSvgObject },
  { match: 'cloud', icon: CloudServerIcon as IconSvgObject },
  { match: 'qa', icon: Bug01Icon as IconSvgObject },
  { match: 'test', icon: Bug01Icon as IconSvgObject },
  { match: 'ai', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'data', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'security', icon: SecurityLockIcon as IconSvgObject },
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
  selector: 'app-create-team-wizard',
  standalone: true,
  imports: [
    FormsModule,
    HugeiconsIconComponent,
    TeamCardPreviewComponent,
    AuthAmbientBgComponent,
    StepFooterActionsComponent,
  ],
  templateUrl: './create-team-wizard.component.html',
  styleUrl: './create-team-wizard.component.css',
})
export class CreateTeamWizardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly teamsApi = inject(TeamsService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly uploadIcon = Upload04Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly checkIcon = CheckmarkCircle02Icon as IconSvgObject;
  protected readonly tickIcon = Tick02Icon as IconSvgObject;
  protected readonly copyIcon = Copy01Icon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  protected readonly phase = signal<WizardPhase>('form');
  protected readonly step = signal<WizardStep>(1);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loadingTaxonomy = signal(true);

  protected readonly name = signal('');
  protected readonly aboutUs = signal('');
  protected readonly logoFile = signal<File | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(null);
  protected readonly logoDragging = signal(false);

  protected readonly coverFile = signal<File | null>(null);
  protected readonly coverPreviewUrl = signal<string | null>(null);
  protected readonly coverDragging = signal(false);

  protected readonly categories = signal<CategoryOptionVm[]>([]);
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly primaryCategoryId = signal<string | null>(null);

  protected readonly allSkills = signal<ChipOption[]>([]);
  protected readonly skillSearch = signal('');
  protected readonly selectedSkillIds = signal<string[]>([]);

  protected readonly specialties = signal<ChipOption[]>([]);
  protected readonly specialtySearch = signal('');
  protected readonly selectedSpecialtyIds = signal<string[]>([]);

  protected readonly createdTeamId = signal<string | null>(null);
  protected readonly inviteCode = signal('');
  protected readonly copied = signal(false);

  protected readonly tourOpen = signal(false);
  protected readonly tourIndex = signal(0);

  protected readonly aboutMax = ABOUT_MAX;

  protected readonly steps = [
    { id: 1 as const, label: 'Identity' },
    { id: 2 as const, label: 'Categories' },
    { id: 3 as const, label: 'Specialties' },
    { id: 4 as const, label: 'Skills' },
    { id: 5 as const, label: 'Review' },
  ];

  protected readonly progressWidth = computed(() => {
    const pct = (this.step() / 5) * 100;
    return `${Math.min(pct, 100)}%`;
  });

  protected readonly backButtonLabel = computed(() => {
    if (this.step() === 1) return 'Cancel';
    if (this.step() === 5) return 'Go back';
    return 'Go back';
  });

  protected readonly continueButtonLabel = computed(() => {
    if (this.step() === 5) return 'Create team';
    if (this.step() === 4) return 'Continue';
    return 'Continue';
  });

  protected readonly secondaryButtonLabel = computed(() =>
    this.step() === 5 || this.step() === 1 ? 'Save draft' : null,
  );

  protected readonly tourStops = [
    {
      title: 'Share your invite code',
      body: 'Teammates can join your agency instantly with this code — no approval wait.',
    },
    {
      title: 'Invite your crew',
      body: 'Send invites now so you can start collaborating on proposals together.',
    },
    {
      title: 'Manage anytime',
      body: 'Edit profile, roles, and portfolio from Team management whenever you need.',
    },
  ];

  protected readonly aboutCount = computed(() => this.aboutUs().length);
  protected readonly aboutProgress = computed(() =>
    Math.min(100, (this.aboutCount() / ABOUT_MAX) * 100),
  );
  protected readonly aboutNearLimit = computed(() => this.aboutCount() >= 1900);

  protected readonly selectedSpecialtyLabels = computed(() => {
    const ids = new Set(this.selectedSpecialtyIds());
    return this.specialties()
      .filter((s) => ids.has(s.id))
      .map((s) => s.label);
  });

  protected readonly filteredSkills = computed(() => {
    const q = this.skillSearch().trim().toLowerCase();
    const skills = this.allSkills();
    if (!q) return skills;
    return skills.filter((s) => s.label.toLowerCase().includes(q));
  });

  protected readonly filteredSpecialties = computed(() => {
    const q = this.specialtySearch().trim().toLowerCase();
    const items = this.specialties();
    if (!q) return items;
    return items.filter((s) => s.label.toLowerCase().includes(q));
  });

  protected readonly selectedSkillLabels = computed(() => {
    const ids = new Set(this.selectedSkillIds());
    return this.allSkills()
      .filter((s) => ids.has(s.id))
      .map((s) => s.label);
  });

  protected readonly primaryCategoryLabel = computed(() => {
    const id = this.primaryCategoryId() ?? this.selectedCategoryIds()[0];
    return this.categories().find((c) => c.id === id)?.label ?? 'Category';
  });

  protected readonly ownerInitials = computed(() => {
    const session = this.auth.session();
    const parts = [session?.firstName, session?.lastName].filter(Boolean) as string[];
    if (!parts.length) return 'FG';
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  });

  protected readonly previewModel = computed<TeamCardPreviewModel>(() => ({
    name: this.name(),
    logoUrl: this.logoPreviewUrl(),
    coverUrl: this.coverPreviewUrl(),
    categoryLabel: this.primaryCategoryLabel(),
    about: this.aboutUs(),
    specialties: this.selectedSpecialtyLabels(),
    skills: this.selectedSkillLabels(),
    ownerInitials: this.ownerInitials(),
    membersCount: 1,
  }));

  protected readonly stepTitle = computed(() => {
    switch (this.step()) {
      case 1:
        return "Let's build your team";
      case 2:
        return 'What are you great at?';
      case 3:
        return 'Any specialties?';
      case 4:
        return 'Which skills define you?';
      default:
        return "You're almost live";
    }
  });

  protected readonly stepHelper = computed(() => {
    switch (this.step()) {
      case 1:
        return 'Add a cover and logo, then tell the community about your agency.';
      case 2:
        return 'Select the categories that match your team so clients can find you faster.';
      case 3:
        return 'Choose specialties based on your categories — they unlock matching skills next.';
      case 4:
        return 'Pick skills from your specialties. You can refine these later in settings.';
      default:
        return 'Confirm your profile, then create your team and share the invite code.';
    }
  });

  protected readonly canContinue = computed(() => {
    switch (this.step()) {
      case 1:
        return this.name().trim().length >= 2;
      case 2:
        return this.selectedCategoryIds().length > 0;
      case 3:
        return this.selectedSpecialtyIds().length > 0;
      case 4:
        return this.selectedSkillIds().length > 0;
      case 5:
        return (
          this.name().trim().length >= 2 &&
          this.selectedCategoryIds().length > 0 &&
          this.selectedSpecialtyIds().length > 0 &&
          this.selectedSkillIds().length > 0
        );
      default:
        return false;
    }
  });

  ngOnInit(): void {
    this.restoreDraft();
    this.loadTaxonomy();
  }

  ngOnDestroy(): void {
    const logoUrl = this.logoPreviewUrl();
    if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    const coverUrl = this.coverPreviewUrl();
    if (coverUrl?.startsWith('blob:')) URL.revokeObjectURL(coverUrl);
  }

  protected stepState(id: WizardStep): 'done' | 'current' | 'todo' {
    const current = this.step();
    if (id < current) return 'done';
    if (id === current) return 'current';
    return 'todo';
  }

  protected onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.name.set(value);
    this.persistDraft();
  }

  protected onAboutInput(event: Event): void {
    let value = (event.target as HTMLTextAreaElement).value;
    if (value.length > ABOUT_MAX) value = value.slice(0, ABOUT_MAX);
    this.aboutUs.set(value);
    this.persistDraft();
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.applyLogo(file);
    input.value = '';
  }

  protected onLogoDrop(event: DragEvent): void {
    event.preventDefault();
    this.logoDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.applyLogo(file);
  }

  protected clearLogo(): void {
    this.applyLogo(null);
  }

  protected openLogoPicker(input: HTMLInputElement): void {
    input.click();
  }

  protected onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.applyCover(file);
    input.value = '';
  }

  protected onCoverDrop(event: DragEvent): void {
    event.preventDefault();
    this.coverDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.applyCover(file);
  }

  protected clearCover(): void {
    this.applyCover(null);
  }

  protected openCoverPicker(input: HTMLInputElement): void {
    input.click();
  }

  protected toggleCategory(id: string): void {
    const selected = this.selectedCategoryIds();
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      this.selectedCategoryIds.set(next);
      if (this.primaryCategoryId() === id) {
        this.primaryCategoryId.set(next[0] ?? null);
      }
    } else {
      const next = [...selected, id];
      this.selectedCategoryIds.set(next);
      if (!this.primaryCategoryId()) {
        this.primaryCategoryId.set(id);
      }
    }
    this.persistDraft();
    this.reloadSpecialties();
  }

  protected setPrimaryCategory(id: string, event: Event): void {
    event.stopPropagation();
    if (!this.selectedCategoryIds().includes(id)) return;
    this.primaryCategoryId.set(id);
    this.persistDraft();
  }

  protected isCategorySelected(id: string): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  protected isPrimaryCategory(id: string): boolean {
    return this.primaryCategoryId() === id;
  }

  protected toggleSkill(id: string): void {
    this.selectedSkillIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    this.persistDraft();
  }

  protected isSkillSelected(id: string): boolean {
    return this.selectedSkillIds().includes(id);
  }

  protected toggleSpecialty(id: string): void {
    this.selectedSpecialtyIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    this.persistDraft();
    this.reloadSkills();
  }

  protected isSpecialtySelected(id: string): boolean {
    return this.selectedSpecialtyIds().includes(id);
  }

  protected goNext(): void {
    if (!this.canContinue() || this.submitting()) return;
    const current = this.step();
    if (current === 5) {
      this.createTeam();
      return;
    }
    this.step.set((current + 1) as WizardStep);
    this.persistDraft();
  }

  protected goBack(): void {
    if (this.submitting()) return;
    const current = this.step();
    if (current === 1) {
      void this.router.navigateByUrl('/developer/teams');
      return;
    }
    this.step.set((current - 1) as WizardStep);
    this.persistDraft();
  }

  protected saveDraft(): void {
    this.persistDraft();
    this.errorMessage.set(null);
  }

  protected createTeam(): void {
    if (!this.canContinue() || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    const categories = this.selectedCategoryIds().map((categoryId) => ({
      categoryId,
      isPrimary: categoryId === (this.primaryCategoryId() ?? this.selectedCategoryIds()[0]),
    }));
    const skillIds = this.selectedSkillIds();
    const specialtyIds = this.selectedSpecialtyIds();

    this.teamsApi
      .createTeam({
        name: this.name().trim(),
        aboutUs: this.aboutUs().trim() || undefined,
        logo: this.logoFile(),
        cover: this.coverFile(),
        categories,
        skillIds,
      })
      .pipe(
        switchMap((teamId) => {
          this.createdTeamId.set(teamId);
          if (!specialtyIds.length) {
            return this.teamsApi.getById(teamId).pipe(map((team) => ({ teamId, team })));
          }
          return this.teamsApi.replaceSpecialties(teamId, specialtyIds).pipe(
            switchMap(() => this.teamsApi.getById(teamId)),
            map((team) => ({ teamId, team })),
          );
        }),
        tap(({ team }) => {
          this.inviteCode.set(team.teamCode);
          this.clearDraft();
          this.phase.set('success');
          if (localStorage.getItem(TOUR_DONE_KEY) !== '1') {
            this.tourOpen.set(true);
            this.tourIndex.set(0);
          }
        }),
        catchError((err) => {
          this.errorMessage.set(extractApiError(err, 'Could not create your team. Please try again.'));
          return of(null);
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe();
  }

  protected async copyInviteCode(): Promise<void> {
    const code = this.inviteCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      this.errorMessage.set('Could not copy the invite code.');
    }
  }

  protected goInviteMembers(): void {
    void this.router.navigateByUrl('/developer/teams');
  }

  protected goTeamManagement(): void {
    const id = this.createdTeamId();
    void this.router.navigateByUrl(id ? `/developer/teams/${id}` : '/developer/teams');
  }

  protected skipForNow(): void {
    void this.router.navigateByUrl('/developer/teams');
  }

  protected tourNext(): void {
    if (this.tourIndex() >= this.tourStops.length - 1) {
      this.finishTour();
      return;
    }
    this.tourIndex.update((i) => i + 1);
  }

  protected skipTour(): void {
    this.finishTour();
  }

  protected finishTour(): void {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    this.tourOpen.set(false);
  }

  protected currentTourStop() {
    return this.tourStops[this.tourIndex()];
  }

  private applyLogo(file: File | null): void {
    const previous = this.logoPreviewUrl();
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);

    if (!file) {
      this.logoFile.set(null);
      this.logoPreviewUrl.set(null);
      this.persistDraft();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please upload an image file for the logo.');
      return;
    }

    this.logoFile.set(file);
    this.logoPreviewUrl.set(URL.createObjectURL(file));
    this.errorMessage.set(null);
    this.persistDraft();
  }

  private applyCover(file: File | null): void {
    const previous = this.coverPreviewUrl();
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);

    if (!file) {
      this.coverFile.set(null);
      this.coverPreviewUrl.set(null);
      this.persistDraft();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please upload an image file for the cover.');
      return;
    }

    this.coverFile.set(file);
    this.coverPreviewUrl.set(URL.createObjectURL(file));
    this.errorMessage.set(null);
    this.persistDraft();
  }

  private loadTaxonomy(): void {
    this.loadingTaxonomy.set(true);
    this.categoriesApi.getCategories().pipe(catchError(() => of([]))).subscribe({
      next: (categories) => {
        this.categories.set(
          categories.map((c) => ({
            id: c.id,
            label: (c.nameEn || c.name || '').trim() || 'Category',
            icon: iconFor(c.nameEn || c.name || ''),
          })),
        );
        this.loadingTaxonomy.set(false);
        this.reloadSpecialties();
      },
      error: () => {
        this.loadingTaxonomy.set(false);
        this.errorMessage.set('Could not load categories.');
      },
    });
  }

  private reloadSpecialties(): void {
    const ids = this.selectedCategoryIds();
    if (!ids.length) {
      this.specialties.set([]);
      this.selectedSpecialtyIds.set([]);
      this.allSkills.set([]);
      this.selectedSkillIds.set([]);
      return;
    }

    forkJoin(ids.map((id) => this.taxonomyApi.getSpecialtiesByCategory(id))).subscribe({
      next: (lists) => {
        const byId = new Map<string, ChipOption>();
        for (const item of lists.flat()) {
          byId.set(item.id, {
            id: item.id,
            label: (item.nameEn || item.nameAr || '').trim() || 'Specialty',
          });
        }
        const next = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
        this.specialties.set(next);
        const valid = new Set(next.map((s) => s.id));
        this.selectedSpecialtyIds.update((selected) => selected.filter((id) => valid.has(id)));
        this.reloadSkills();
      },
    });
  }

  private reloadSkills(): void {
    const specialtyIds = this.selectedSpecialtyIds();
    if (!specialtyIds.length) {
      this.allSkills.set([]);
      this.selectedSkillIds.set([]);
      this.persistDraft();
      return;
    }

    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (skills) => {
        const next = skills.map((s) => ({
          id: s.id,
          label: (s.name || '').trim() || 'Skill',
        }));
        this.allSkills.set(next);
        const valid = new Set(next.map((s) => s.id));
        this.selectedSkillIds.update((selected) => selected.filter((id) => valid.has(id)));
        this.persistDraft();
      },
      error: () => {
        this.allSkills.set([]);
        this.selectedSkillIds.set([]);
      },
    });
  }

  protected persistDraft(): void {
    const payload: DraftPayload = {
      step: this.step(),
      name: this.name(),
      aboutUs: this.aboutUs(),
      selectedCategoryIds: this.selectedCategoryIds(),
      primaryCategoryId: this.primaryCategoryId(),
      selectedSkillIds: this.selectedSkillIds(),
      selectedSpecialtyIds: this.selectedSpecialtyIds(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftPayload;
      if (draft.name) this.name.set(draft.name);
      if (draft.aboutUs) this.aboutUs.set(draft.aboutUs);
      if (Array.isArray(draft.selectedCategoryIds)) {
        this.selectedCategoryIds.set(draft.selectedCategoryIds);
      }
      if (draft.primaryCategoryId) this.primaryCategoryId.set(draft.primaryCategoryId);
      if (Array.isArray(draft.selectedSkillIds)) this.selectedSkillIds.set(draft.selectedSkillIds);
      if (Array.isArray(draft.selectedSpecialtyIds)) {
        this.selectedSpecialtyIds.set(draft.selectedSpecialtyIds);
      }
      if (draft.step >= 1 && draft.step <= 5) this.step.set(draft.step);
    } catch {
      /* ignore bad draft */
    }
  }

  private clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }
}
