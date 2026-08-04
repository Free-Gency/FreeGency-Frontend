import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Search01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { catchError, of } from 'rxjs';
import { CategoriesApiService } from '../../../auth/data-access/categories-api.service';
import {
  PortfolioApiService,
  type PortfolioProjectDetailsDto,
} from '../../../auth/data-access/portfolio-api.service';
import { TaxonomyApiService } from '../../../auth/data-access/taxonomy-api.service';
import {
  TeamsService,
  type TeamPortfolioWriteInput,
} from '../../data-access/teams.service';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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

interface TeamPersonRow {
  name: string;
  role: string;
  userId?: string | null;
}

interface TeamMemberOption {
  userId: string;
  name: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-portfolio-case-study-wizard',
  standalone: true,
  imports: [FormsModule, RouterLink, HugeiconsIconComponent],
  templateUrl: './portfolio-case-study-wizard.component.html',
  styleUrl: './portfolio-case-study-wizard.component.css',
})
export class PortfolioCaseStudyWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsApi = inject(TeamsService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly deleteIcon = Delete02Icon as IconSvgObject;
  protected readonly tickIcon = Tick02Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;

  protected readonly teamId = signal('');
  protected readonly projectId = signal<string | null>(null);
  protected readonly isEdit = computed(() => !!this.projectId());
  protected readonly step = signal<WizardStep>(1);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly imageFiles = signal<File[]>([]);
  protected readonly existingCover = signal<string | null>(null);

  protected readonly challenge = signal('');
  protected readonly solution = signal('');

  protected readonly projectUrl = signal('');
  protected readonly prototypeUrl = signal('');
  protected readonly budget = signal('');
  protected readonly durationLabel = signal('');
  protected readonly completionDate = signal('');
  protected readonly industry = signal('');
  protected readonly visibility = signal('Public');

  protected readonly teamPeople = signal<TeamPersonRow[]>([{ name: '', role: '' }]);
  protected readonly teamMembers = signal<TeamMemberOption[]>([]);
  protected readonly memberSearch = signal('');
  protected readonly memberPickerOpen = signal(false);

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
    'Team',
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

  protected readonly teamPeopleCount = computed(
    () => this.teamPeople().filter((p) => p.name.trim()).length,
  );

  protected readonly filteredMembers = computed(() => {
    const q = this.memberSearch().trim().toLowerCase();
    const taken = new Set(
      this.teamPeople()
        .map((p) => p.userId)
        .filter((id): id is string => !!id),
    );
    return this.teamMembers()
      .filter((m) => !taken.has(m.userId))
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 8);
  });

  ngOnInit(): void {
    const teamId = this.route.snapshot.paramMap.get('teamId') ?? '';
    const projectId = this.route.snapshot.paramMap.get('projectId');
    this.teamId.set(teamId);
    this.projectId.set(projectId);

    this.categoriesApi.getCategories().pipe(catchError(() => of([]))).subscribe({
      next: (cats) => {
        this.categories.set(
          cats.map((c) => ({
            id: c.id,
            label: (c.nameEn || c.name || '').trim() || 'Category',
          })),
        );
      },
    });

    if (!teamId) {
      this.error.set('Team not found.');
      this.loading.set(false);
      return;
    }

    this.teamsApi.getById(teamId, { skipLoading: true }).subscribe({
      next: (team) => {
        const members: TeamMemberOption[] = (team.memberAvatars ?? []).map((m) => ({
          userId: m.userId,
          name: (m.name || '').trim() || 'Member',
          imageUrl: m.imageUrl ?? null,
        }));
        if (team.ownerName?.trim() && team.ownerUserId) {
          const exists = members.some((m) => m.userId === team.ownerUserId);
          if (!exists) {
            members.unshift({
              userId: team.ownerUserId,
              name: team.ownerName.trim(),
              imageUrl: null,
            });
          }
        }
        this.teamMembers.set(members);

        const specialtyIds = (team.specialties ?? []).map((s) => s.specialtyId);
        const loadSkills = specialtyIds.length
          ? this.taxonomyApi.getSkillsForSpecialties(specialtyIds)
          : of(
              (team.skills ?? []).map((s) => ({
                id: s.skillId,
                name: s.name,
              })),
            );

        loadSkills.subscribe({
          next: (skills) => {
            const mapped = skills.map((s) => ({
              id: s.id,
              label: (s.name || '').trim() || 'Skill',
            }));
            const fromTeam = (team.skills ?? []).map((s) => ({
              id: s.skillId,
              label: s.name,
            }));
            const byId = new Map<string, ChipOption>();
            for (const s of [...mapped, ...fromTeam]) byId.set(s.id, s);
            this.allSkills.set([...byId.values()].sort((a, b) => a.label.localeCompare(b.label)));

            if (projectId) {
              this.portfolioApi.getDetails(projectId).subscribe({
                next: (details) => {
                  this.applyDetails(details);
                  this.loading.set(false);
                },
                error: () => {
                  this.error.set('Could not load portfolio project.');
                  this.loading.set(false);
                },
              });
            } else {
              this.loading.set(false);
            }
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Could not load team.');
        this.loading.set(false);
      },
    });
  }

  protected setStep(step: WizardStep): void {
    this.step.set(step);
  }

  protected goToStep(step: number): void {
    if (step >= 1 && step <= 8) this.step.set(step as WizardStep);
  }

  protected next(): void {
    if (this.step() < 8) this.step.set((this.step() + 1) as WizardStep);
  }

  protected back(): void {
    if (this.step() > 1) this.step.set((this.step() - 1) as WizardStep);
  }

  protected toggleSkill(id: string): void {
    const selected = this.selectedSkillIds();
    this.selectedSkillIds.set(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }

  protected onImagesPicked(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.imageFiles.set(files.slice(0, 10));
  }

  protected addRoadmapRow(): void {
    this.roadmap.update((rows) => [...rows, { title: '', isDone: false }]);
  }

  protected removeRoadmapRow(index: number): void {
    this.roadmap.update((rows) => rows.filter((_, i) => i !== index));
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
    this.metrics.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected updateMetric(index: number, patch: Partial<MetricRow>): void {
    this.metrics.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  protected addTeamPerson(): void {
    this.teamPeople.update((rows) => [...rows, { name: '', role: '' }]);
  }

  protected removeTeamPerson(index: number): void {
    this.teamPeople.update((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length ? next : [{ name: '', role: '' }];
    });
  }

  protected updateTeamPerson(index: number, patch: Partial<TeamPersonRow>): void {
    this.teamPeople.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  protected pickTeamMember(member: TeamMemberOption): void {
    const emptyIndex = this.teamPeople().findIndex((p) => !p.name.trim());
    if (emptyIndex >= 0) {
      this.updateTeamPerson(emptyIndex, {
        name: member.name,
        userId: member.userId,
      });
    } else {
      this.teamPeople.update((rows) => [
        ...rows,
        { name: member.name, role: '', userId: member.userId },
      ]);
    }
    this.memberSearch.set('');
    this.memberPickerOpen.set(false);
  }

  protected onMemberSearch(value: string): void {
    this.memberSearch.set(value);
    this.memberPickerOpen.set(true);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.pw-search')) {
      this.memberPickerOpen.set(false);
    }
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  }

  protected save(): void {
    const teamId = this.teamId();
    const title = this.title().trim();
    if (!teamId || !title) {
      this.error.set('Title is required.');
      this.step.set(1);
      return;
    }

    const payload: TeamPortfolioWriteInput = {
      title,
      description: this.description(),
      budget: this.budget() ? Number(this.budget()) : null,
      projectUrl: this.projectUrl() || null,
      prototypeUrl: this.prototypeUrl() || null,
      completionDate: this.completionDate() || null,
      categoryId: this.categoryId(),
      visibility: this.visibility(),
      challenge: this.challenge(),
      solution: this.solution(),
      durationLabel: this.durationLabel(),
      industry: this.industry(),
      teamLeads: this.serializeTeamPeople(),
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
    };

    this.saving.set(true);
    this.error.set(null);
    const projectId = this.projectId();

    if (projectId) {
      this.teamsApi.updateTeamPortfolio(teamId, projectId, payload).subscribe({
        next: () => {
          const extraImages = this.imageFiles();
          const afterImages = () => {
            this.teamsApi.replaceTeamPortfolioSkills(teamId, projectId, payload.skillIds ?? []).subscribe({
              next: () => this.finish(teamId, projectId),
              error: () => this.finish(teamId, projectId),
            });
          };
          if (extraImages.length) {
            this.teamsApi.uploadTeamPortfolioImages(teamId, projectId, extraImages).subscribe({
              next: afterImages,
              error: afterImages,
            });
          } else {
            afterImages();
          }
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Could not save portfolio project.');
        },
      });
      return;
    }

    this.teamsApi.createTeamPortfolio(teamId, payload).subscribe({
      next: (id) => this.finish(teamId, id),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not create portfolio project.');
      },
    });
  }

  private serializeTeamPeople(): string {
    return this.teamPeople()
      .filter((p) => p.name.trim())
      .map((p) => {
        const name = p.name.trim();
        const role = p.role.trim();
        return role ? `${name} / ${role}` : name;
      })
      .join(', ');
  }

  private parseTeamPeople(raw: string | null | undefined): TeamPersonRow[] {
    const text = (raw ?? '').trim();
    if (!text) return [{ name: '', role: '' }];

    const members = this.teamMembers();
    return text
      .split(/[,;|]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const split = part.split(/\s*[\/·–—-]\s+/).map((s) => s.trim()).filter(Boolean);
        const name = split[0] ?? part;
        const role = split.length >= 2 ? split.slice(1).join(' / ') : '';
        const match = members.find((m) => m.name.toLowerCase() === name.toLowerCase());
        return { name, role, userId: match?.userId ?? null };
      });
  }

  private finish(teamId: string, projectId: string): void {
    this.saving.set(false);
    void this.router.navigateByUrl(`/developer/portfolio/${projectId}`, {
      state: { fromTeamId: teamId },
    });
  }

  private applyDetails(details: PortfolioProjectDetailsDto): void {
    this.title.set(details.title ?? '');
    this.description.set(details.description ?? '');
    this.existingCover.set(details.imageCover ?? null);
    this.projectUrl.set(details.projectUrl ?? '');
    this.prototypeUrl.set(details.prototypeUrl ?? '');
    this.budget.set(details.budget != null ? String(details.budget) : '');
    this.completionDate.set(
      details.completionDate ? details.completionDate.slice(0, 10) : '',
    );
    this.challenge.set(details.challenge ?? '');
    this.solution.set(details.solution ?? '');
    this.durationLabel.set(details.durationLabel ?? '');
    this.industry.set(details.industry ?? '');
    this.teamPeople.set(this.parseTeamPeople(details.teamLeads));
    this.testimonialQuote.set(details.testimonialQuote ?? '');
    this.testimonialAuthorName.set(details.testimonialAuthorName ?? '');
    this.testimonialAuthorTitle.set(details.testimonialAuthorTitle ?? '');
    this.visibility.set(String(details.visibility ?? 'Public'));
    this.selectedSkillIds.set((details.skills ?? []).map((s) => s.id));

    const cat = this.categories().find(
      (c) => c.label === (details.categoryName ?? '').trim(),
    );
    if (cat) this.categoryId.set(cat.id);

    const steps = details.roadmapSteps ?? [];
    this.roadmap.set(
      steps.length
        ? steps.map((s) => ({ title: s.title, isDone: !!s.isDone }))
        : [{ title: '', isDone: false }],
    );
    const metrics = details.metrics ?? [];
    this.metrics.set(
      metrics.length
        ? metrics.map((m) => ({ value: m.value, label: m.label }))
        : [{ value: '', label: '' }],
    );
  }
}
