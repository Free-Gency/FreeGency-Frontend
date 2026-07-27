import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowLeft01Icon,
  Calendar01Icon,
  Link01Icon,
  Location01Icon,
  Money01Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import {
  PortfolioApiService,
  type OwnerReviewDto,
  type PortfolioProjectDetailsDto,
} from '../../../auth/data-access/portfolio-api.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';

@Component({
  selector: 'app-portfolio-project-details',
  imports: [
    ClientViewNavbarComponent,
    RouterLink,
    HugeiconsIconComponent,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './portfolio-project-details.component.html',
  styleUrl: './portfolio-project-details.component.css',
})
export class PortfolioProjectDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = inject(AuthService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly moneyIcon = Money01Icon as IconSvgObject;
  protected readonly calendarIcon = Calendar01Icon as IconSvgObject;
  protected readonly linkIcon = Link01Icon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly locationIcon = Location01Icon as IconSvgObject;
  protected readonly teamIcon = UserGroupIcon as IconSvgObject;
  protected readonly starChoices = [1, 2, 3, 4, 5] as const;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly details = signal<PortfolioProjectDetailsDto | null>(null);
  protected readonly activeImage = signal<string | null>(null);
  protected readonly reviews = signal<OwnerReviewDto[]>([]);

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

  protected readonly heroImage = computed(
    () => this.activeImage() || this.gallery()[0] || null,
  );

  protected readonly averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  protected readonly canReview = computed(() => {
    const item = this.details();
    const userId = this.auth.session()?.id;
    if (!item || !userId) return false;
    if (item.ownerUserId === userId) return false;
    return !this.reviews().some((r) => r.reviewerUserId === userId);
  });

  ngOnInit(): void {
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
    void this.router.navigateByUrl('/client/home');
  }

  protected initials(name: string | null | undefined): string {
    const parts = (name || 'F').trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'F';
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
          this.reviews.update((list) => [review, ...list]);
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
          this.reviews.set(details.ownerReviews ?? []);
          this.activeImage.set(null);
          this.loading.set(false);
          this.portfolioApi.recordView(id).subscribe({ error: () => undefined });
        },
        error: () => {
          this.error.set('This portfolio is unavailable or private.');
          this.loading.set(false);
        },
      });
  }
}
