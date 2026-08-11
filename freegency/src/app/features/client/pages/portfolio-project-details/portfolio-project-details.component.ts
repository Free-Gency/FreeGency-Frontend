import { DatePipe, DecimalPipe, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Alert02Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Link01Icon,
  Location01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import {
  PortfolioApiService,
  type OwnerReviewDto,
  type PortfolioProjectDetailsDto,
  type PortfolioProjectDto,
} from '../../../auth/data-access/portfolio-api.service';
import { TeamsService } from '../../../developer/data-access/teams.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';

@Component({
  selector: 'app-portfolio-project-details',
  imports: [
    ClientViewNavbarComponent,
    DeveloperViewNavbarComponent,
    RouterLink,
    HugeiconsIconComponent,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './portfolio-project-details.component.html',
  styleUrl: './portfolio-project-details.component.css',
})
export class PortfolioProjectDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly teamsApi = inject(TeamsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = inject(AuthService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly calendarIcon = Calendar01Icon as IconSvgObject;
  protected readonly linkIcon = Link01Icon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly locationIcon = Location01Icon as IconSvgObject;
  protected readonly challengeIcon = Alert02Icon as IconSvgObject;
  protected readonly solutionIcon = CheckmarkCircle02Icon as IconSvgObject;
  protected readonly starChoices = [1, 2, 3, 4, 5] as const;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly details = signal<PortfolioProjectDetailsDto | null>(null);
  protected readonly activeImage = signal<string | null>(null);
  protected readonly reviews = signal<OwnerReviewDto[]>([]);
  protected readonly relatedProjects = signal<PortfolioProjectDto[]>([]);
  private readonly fromTeamId = signal<string | null>(null);
  private readonly teamPortfolioTotal = signal(0);

  protected readonly portfolioCount = computed(() => {
    const total = this.teamPortfolioTotal();
    if (total > 0) return total;
    const related = this.relatedProjects().length;
    return related > 0 ? related + 1 : 1;
  });

  protected readonly teamMembers = computed(() => {
    const raw = this.details()?.teamLeads?.trim();
    if (!raw) return [] as { name: string; role: string }[];

    return raw
      .split(/[,;|]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const split = part
          .split(/\s*[\/·–—-]\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (split.length >= 2) {
          return { name: split[0], role: split.slice(1).join(' / ') };
        }
        return { name: part, role: '' };
      });
  });

  protected readonly ratingDraft = signal(0);
  protected readonly hoverRating = signal(0);
  protected readonly commentDraft = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly gallery = computed(() => {
    const item = this.details();
    if (!item) return [] as string[];

    const urls = (item.images ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => img.imageUrl)
      .filter(Boolean);

    if (item.imageCover && !urls.includes(item.imageCover)) {
      return [item.imageCover, ...urls];
    }
    if (urls.length) return urls;
    if (item.imageCover) return [item.imageCover];
    return ['/assets/client-home/e-learning-dashboard.jpg'];
  });

  protected readonly heroImage = computed(() => this.activeImage() || this.gallery()[0] || null);

  protected readonly averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    const sum = list.reduce((acc, r) => acc + this.starRating(r.rating), 0);
    return sum / list.length;
  });

  protected readonly roundedAverage = computed(() => Math.round(this.averageRating()));

  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected starRating(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(5, Math.max(0, Math.round(n)));
  }

  protected readonly canReview = computed(() => {
    const item = this.details();
    const userId = this.auth.session()?.id;
    if (!item || !userId) return false;
    if (item.ownerUserId === userId) return false;
    return !this.reviews().some((r) => r.reviewerUserId === userId);
  });

  protected readonly editHref = computed(() => {
    const item = this.details();
    const teamId = this.fromTeamId() || item?.ownerTeamId;
    if (!item || !teamId || !this.auth.session()) return null;
    if (this.auth.session()?.activeProfileMode !== 'Developer') return null;
    if (!item.canEdit) return null;
    return ['/developer/teams', teamId, 'portfolio', item.id, 'edit'] as const;
  });

  protected readonly portfolioDetailBase = computed(() =>
    this.auth.session()?.activeProfileMode === 'Developer'
      ? '/developer/portfolio'
      : '/client/inspiration',
  );

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const stateTeam =
      (nav?.extras.state as { fromTeamId?: string } | undefined)?.fromTeamId ??
      (history.state as { fromTeamId?: string } | null)?.fromTeamId ??
      null;
    this.fromTeamId.set(stateTeam);

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Portfolio not found.');
      this.loading.set(false);
      return;
    }
    this.loadDetails(id);
  }

  protected selectImage(url: string): void {
    this.activeImage.set(url);
  }

  protected goBack(): void {
    const teamId = this.fromTeamId() || this.details()?.ownerTeamId;
    const isDeveloper = this.auth.session()?.activeProfileMode === 'Developer';

    if (teamId && isDeveloper) {
      void this.router.navigateByUrl(`/developer/teams/${teamId}`);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(isDeveloper ? '/developer/me/portfolio' : '/client/home');
  }
  protected initials(name: string | null | undefined): string {
    const parts = (name || 'F').trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'F';
  }

  protected creatorBio(bio: string | null | undefined): string | null {
    const text = (bio ?? '').trim();
    if (!text) return null;
    const unique = new Set([...text.replace(/\s/g, '')]);
    if (text.length > 24 && unique.size <= 4) return null;
    return text;
  }

  protected successLabel(creator: { averageRating: number; ratingCount: number }): string {
    if (!creator.ratingCount || creator.averageRating <= 0) return '—';
    const pct = Math.round((creator.averageRating / 5) * 100);
    return `${pct}%`;
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  protected submitReview(): void {
    const item = this.details();
    if (!item || this.submitting()) return;

    if (!this.auth.session()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }

    const rating = this.ratingDraft();
    if (rating < 1 || rating > 5) {
      this.submitError.set('Please choose a star rating.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.portfolioApi
      .addFeedback(item.id, {
        rating,
        comment: this.commentDraft().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (review) => {
          this.reviews.update((list) => [
            { ...review, rating: this.starRating(review.rating) },
            ...list,
          ]);
          this.ratingDraft.set(0);
          this.commentDraft.set('');
          this.submitting.set(false);
        },
        error: (err: unknown) => {
          this.submitError.set(extractApiError(err) || 'Could not submit your review.');
          this.submitting.set(false);
        },
      });
  }

  private loadDetails(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.portfolioApi
      .getDetails(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => {
          this.details.set(details);
          this.reviews.set(
            (details.ownerReviews ?? []).map((r) => ({
              ...r,
              rating: this.starRating(
                (r as OwnerReviewDto & { Rating?: number }).rating ??
                  (r as OwnerReviewDto & { Rating?: number }).Rating,
              ),
            })),
          );
          this.activeImage.set(null);
          this.loading.set(false);
          this.portfolioApi.recordView(id).subscribe({ error: () => undefined });
          this.loadRelated(details);
        },
        error: () => {
          this.error.set('This portfolio is unavailable or private.');
          this.loading.set(false);
        },
      });
  }

  private loadRelated(details: PortfolioProjectDetailsDto): void {
    const teamId = details.ownerTeamId;
    if (!teamId) {
      this.relatedProjects.set([]);
      this.teamPortfolioTotal.set(0);
      return;
    }

    this.teamsApi.getTeamPortfolio(teamId, { skipLoading: true }).subscribe({
      next: (items) => {
        this.teamPortfolioTotal.set(items.length);
        this.relatedProjects.set(
          items
            .filter((p) => p.id !== details.id)
            .slice(0, 3)
            .map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description ?? '',
              budget: null,
              imageCover: p.imageCover ?? null,
              projectUrl: null,
              completionDate: null,
              visibility: 'Public',
              categoryName: null,
              ownerName: details.ownerName,
            })),
        );
      },
      error: () => {
        this.relatedProjects.set([]);
        this.teamPortfolioTotal.set(0);
      },
    });
  }
}
