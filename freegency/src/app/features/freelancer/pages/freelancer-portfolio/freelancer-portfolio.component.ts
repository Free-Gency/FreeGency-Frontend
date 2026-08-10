import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../shared/services/toast.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { FreelancerPortfolioService } from '../../data-access/freelancer-portfolio.service';
import {
  DeveloperProfile,
  PortfolioProjectDto,
  PortfolioReviewDto,
  SocialLinkDto,
} from '../../model/portfolio.model';
import { PortfolioAboutComponent } from '../components/portfolio-about/portfolio-about.component';
import { PortfolioAvailabilityComponent } from '../components/portfolio-availability/portfolio-availability.component';
import { PortfolioHeaderComponent } from '../components/portfolio-header/portfolio-header.component';
import { ProfileStrengthComponent } from '../components/profile-strength/profile-strength.component';
import { ProjectCardComponent } from '../components/project-card/project-card.component';
import { ReviewCardComponent } from '../components/review-card/review-card.component';

@Component({
  selector: 'app-freelancer-portfolio',
  standalone: true,
  imports: [
    RouterLink,
    ClientViewNavbarComponent,
    DeveloperViewNavbarComponent,
    PortfolioHeaderComponent,
    PortfolioAboutComponent,
    PortfolioAvailabilityComponent,
    ProfileStrengthComponent,
    ProjectCardComponent,
    ReviewCardComponent,
  ],
  templateUrl: './freelancer-portfolio.component.html',
  styleUrl: './freelancer-portfolio.component.css',
})
export class FreelancerPortfolioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FreelancerPortfolioService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly starChoices = [1, 2, 3, 4, 5] as const;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<DeveloperProfile | null>(null);
  protected readonly projects = signal<PortfolioProjectDto[]>([]);
  protected readonly socialLinks = signal<SocialLinkDto[]>([]);
  protected readonly reviews = signal<PortfolioReviewDto[]>([]);
  protected readonly userId = signal<string | null>(null);

  protected readonly reviewRating = signal(0);
  protected readonly reviewHover = signal(0);
  protected readonly reviewComment = signal('');
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<string | null>(null);

  protected readonly isClientViewer = computed(
    () => this.auth.session()?.activeProfileMode === 'Client',
  );

  protected readonly canEdit = computed(() => {
    const sessionId = this.auth.session()?.id;
    const uid = this.userId();
    if (!sessionId || !uid) return false;
    return sessionId === uid && !this.isClientViewer();
  });

  protected readonly canLeaveReview = computed(() => {
    const sessionId = this.auth.session()?.id;
    const uid = this.userId();
    if (!sessionId || !uid) return false;
    if (sessionId === uid) return false;
    return !this.reviews().some((r) => r.reviewerUserId === sessionId);
  });

  ngOnInit(): void {
    const routeUserId = this.route.snapshot.paramMap.get('userId');
    const isMe = this.route.snapshot.data['me'] === true;

    if (isMe) {
      const me = this.auth.session()?.id ?? null;
      this.userId.set(me);
      this.loadMine();
      return;
    }

    if (!routeUserId) {
      this.error.set('Developer portfolio not found.');
      this.loading.set(false);
      return;
    }

    this.userId.set(routeUserId);
    this.loadPublic(routeUserId);
  }

  protected openProject(project: PortfolioProjectDto): void {
    const path = this.isClientViewer()
      ? ['/client/inspiration', project.id]
      : ['/developer/portfolio', project.id];
    void this.router.navigate(path);
  }

  protected onReviewCommentInput(event: Event): void {
    this.reviewComment.set((event.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  protected submitReview(): void {
    const uid = this.userId();
    if (!uid || this.reviewSubmitting() || !this.canLeaveReview()) return;

    const rating = this.reviewRating();
    if (rating < 1) {
      this.reviewError.set('Please choose a star rating.');
      return;
    }

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);

    this.api
      .addReview(uid, {
        rating,
        comment: this.reviewComment().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (review) => {
          const hidden = (review.moderationStatus || '').toLowerCase() === 'hidden';
          if (!hidden) {
            this.reviews.set([review, ...this.reviews()]);
            const p = this.profile();
            if (p) {
              const nextCount = (p.ratingCount || 0) + 1;
              const nextAvg =
                ((Number(p.averageRating) || 0) * (p.ratingCount || 0) + rating) / nextCount;
              this.profile.set({
                ...p,
                ratingCount: nextCount,
                averageRating: Math.round(nextAvg * 100) / 100,
                jobSuccessRate: Math.round(Math.min(5, Math.max(0, nextAvg)) / 5 * 100),
              });
            }
          }
          this.reviewRating.set(0);
          this.reviewComment.set('');
          this.reviewSubmitting.set(false);
          if (review.moderationWarning) {
            this.reviewError.set(review.moderationWarning);
            this.toast.warning(
              review.moderationWarning,
              'Your review broke FreeGency rules',
            );
          }
        },
        error: (err) => {
          const msg = extractApiError(err, 'Could not submit your review.');
          this.reviewError.set(msg);
          this.toast.warning(msg, 'Review not accepted');
          this.reviewSubmitting.set(false);
        },
      });
  }

  private loadMine(): void {
    forkJoin({
      profile: this.api.getMyProfile(),
      projects: this.api.getMyProjects().pipe(catchError(() => of([]))),
      socialLinks: this.api.getSocialLinks(null).pipe(catchError(() => of([]))),
      reviews: this.api.getMyReviews().pipe(catchError(() => of([]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.error.set('Could not load your portfolio.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        this.profile.set(res.profile);
        this.projects.set(res.projects);
        this.socialLinks.set(res.socialLinks);
        this.reviews.set(res.reviews);
        if (res.profile?.userId) this.userId.set(res.profile.userId);
        this.loading.set(false);
      });
  }

  private loadPublic(userId: string): void {
    forkJoin({
      profile: this.api.getPublicProfile(userId),
      projects: this.api.getPublicProjects(userId).pipe(catchError(() => of([]))),
      socialLinks: this.api.getSocialLinks(userId).pipe(catchError(() => of([]))),
      reviews: this.api.getPublicReviews(userId).pipe(catchError(() => of([]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.error.set('Could not load this developer portfolio.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        this.profile.set(res.profile);
        this.projects.set(res.projects);
        this.socialLinks.set(res.socialLinks);
        this.reviews.set(res.reviews);
        if (res.profile?.userId) this.userId.set(res.profile.userId);
        this.loading.set(false);
      });
  }
}
