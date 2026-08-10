import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ProjectsApiService, type ProjectDto } from '../../../auth/data-access/projects-api.service';
import { ProjectCandidatesApiService } from '../../../project/data-access/project-candidates-api.service';
import type { SuggestedCandidate } from '../../../project/models/project-candidates';
import { InviteToProjectModalComponent } from '../invite-to-project-modal/invite-to-project-modal.component';
import type { InviteTarget } from '../../models/project-invitation';
interface HomeTalentCard extends SuggestedCandidate {
  projectId: string;
  projectTitle: string;
}

@Component({
  selector: 'app-home-talent-suggestions',
  standalone: true,
  imports: [DecimalPipe, RouterLink, InviteToProjectModalComponent],
  templateUrl: './home-talent-suggestions.component.html',
  styleUrl: './home-talent-suggestions.component.css',
})
export class HomeTalentSuggestionsComponent implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly candidatesApi = inject(ProjectCandidatesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly loadingProjects = signal(true);
  protected readonly loadingTalent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly openProjects = signal<ProjectDto[]>([]);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly talent = signal<HomeTalentCard[]>([]);
  protected readonly inviteTarget = signal<InviteTarget | null>(null);
  protected readonly inviteProjectId = signal<string | null>(null);

  protected readonly selectedProject = computed(() => {
    const id = this.selectedProjectId();
    return this.openProjects().find((p) => p.id === id) ?? null;
  });

  protected readonly hasOpenProjects = computed(() => this.openProjects().length > 0);

  ngOnInit(): void {
    this.load();
  }

  protected selectProject(projectId: string): void {
    if (this.selectedProjectId() === projectId) return;
    this.selectedProjectId.set(projectId);
    this.loadCandidatesFor(projectId);
  }

  protected retry(): void {
    this.load();
  }

  protected matchPercent(score: number): number {
    return Math.round(Math.min(1, Math.max(0, score)) * 100);
  }

  protected initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'FG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  protected typeLabel(type: string): string {
    return type === 'Team' ? 'Team' : 'Developer';
  }

  protected isTeam(card: HomeTalentCard): boolean {
    return (card.candidateType || '').toLowerCase() === 'team';
  }

  protected formatBudget(project: ProjectDto): string {
    const currency = project.currency || 'USD';
    if (project.isFixedPrice) {
      return `Fixed · ${currency} ${project.budgetMin}`;
    }
    return `${currency} ${project.budgetMin} – ${project.budgetMax}`;
  }

  protected formatTimeline(project: ProjectDto): string {
    if (project.deadline) {
      const date = new Date(project.deadline);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    if (project.estimatedDurationDays) {
      return `${project.estimatedDurationDays} days`;
    }
    return 'Flexible';
  }

  protected openProject(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }

  protected invite(card: HomeTalentCard): void {
    this.inviteTarget.set({
      inviteeType: this.isTeam(card) ? 'Team' : 'User',
      inviteeTeamId: this.isTeam(card) ? card.id : null,
      inviteeUserId: this.isTeam(card) ? null : card.id,
      displayName: card.name,
    });
    this.inviteProjectId.set(card.projectId);
  }

  protected closeInvite(): void {
    this.inviteTarget.set(null);
    this.inviteProjectId.set(null);
  }

  protected viewDetails(card: HomeTalentCard): void {
    // Teams → existing team detail page.
    if (this.isTeam(card)) {
      void this.router.navigate(['/client/teams', card.id], {
        fragment: 'portfolio',
      });
      return;
    }

    // Developers → Sama's freelancer portfolio page.
    void this.router.navigate(['/client/developers', card.id]);
  }

  private load(): void {
    this.loadingProjects.set(true);
    this.error.set(null);

    this.projectsApi
      .getMine({ role: 'as-client', pageNumber: 1, pageSize: 8, status: 'open' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((page) => {
          const projects = (page.items ?? []).filter(
            (p) => (p.status || '').toLowerCase() === 'open',
          );
          this.openProjects.set(projects);
          this.loadingProjects.set(false);

          if (!projects.length) {
            this.selectedProjectId.set(null);
            this.talent.set([]);
            return of(null);
          }

          const preferred =
            projects.find((p) => p.id === this.selectedProjectId()) ?? projects[0];
          this.selectedProjectId.set(preferred.id);
          return this.fetchCandidates(preferred);
        }),
        catchError(() => {
          this.error.set('Could not load talent suggestions.');
          this.loadingProjects.set(false);
          this.loadingTalent.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  private loadCandidatesFor(projectId: string): void {
    const project = this.openProjects().find((p) => p.id === projectId);
    if (!project) return;

    this.error.set(null);
    this.fetchCandidates(project)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private fetchCandidates(project: ProjectDto) {
    this.loadingTalent.set(true);
    return this.candidatesApi.getCandidatesForProject(project.id, 10).pipe(
      map((res) => {
        const cards: HomeTalentCard[] = (res.candidates ?? []).map((c) =>
          this.normalizeCard(c, project),
        );
        this.talent.set(cards);
        this.loadingTalent.set(false);
      }),
      catchError(() => {
        this.error.set('Could not load talent suggestions.');
        this.talent.set([]);
        this.loadingTalent.set(false);
        return of(void 0);
      }),
    );
  }

  private normalizeCard(c: SuggestedCandidate, project: ProjectDto): HomeTalentCard {
    return {
      ...c,
      about: c.about ?? null,
      avatarUrl: c.avatarUrl ?? null,
      coverImageUrl: c.coverImageUrl ?? null,
      skills: c.skills ?? [],
      specialties: c.specialties ?? [],
      categories: c.categories ?? [],
      averageRating: Number(c.averageRating ?? 0),
      ratingCount: Number(c.ratingCount ?? 0),
      portfolioProjectCount: Number(c.portfolioProjectCount ?? 0),
      completedProjectsCount: Number(c.completedProjectsCount ?? 0),
      memberCount: c.memberCount == null ? null : Number(c.memberCount),
      featuredPortfolioProjectId: c.featuredPortfolioProjectId ?? null,
      featuredPortfolioTitle: c.featuredPortfolioTitle ?? null,
      projectId: project.id,
      projectTitle: project.title,
    };
  }
}
