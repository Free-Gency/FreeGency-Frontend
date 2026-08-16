import { Component, computed, DestroyRef, inject, Input, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TeamsService } from '../../data-access/teams.service';
import { TeamJoinRequest } from '../../models/team';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-team-request-job',
  imports: [DatePipe],
  templateUrl: './team-request-job.component.html',
  styleUrl: './team-request-job.component.css',
})
export class TeamRequestJobComponent {
  private readonly teamsApi = inject(TeamsService);
  private readonly router = inject(Router);

  @Input({ required: true }) teamId!: string;

  protected readonly requests = signal<TeamJoinRequest[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Pagination
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = signal(10);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly totalCount = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly selectedStatus = signal<string | null>(null);

  protected setStatus(status: string | null): void {
    this.selectedStatus.set(status);
    this.pageNumber.set(1);
    this.loadRequests();
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  protected readonly pages = computed(() =>
    Array.from(
      { length: this.totalPages() },
      (_, index) => index + 1,
    ),
  );

  protected loadRequests(): void {
    if (!this.teamId) return;

    this.loading.set(true);
    this.error.set(null);

    this.teamsApi
      .getTeamJoinRequests({
        teamId: this.teamId,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        status: this.selectedStatus() ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.requests.set(response.items ?? []);

          this.pageNumber.set(response.pageNumber);
          this.pageSize.set(response.pageSize);

          this.totalCount.set(response.totalCount);
          this.totalPages.set(response.totalPages);

          this.hasPreviousPage.set(response.hasPreviousPage);
          this.hasNextPage.set(response.hasNextPage);

          this.loading.set(false);
        },
        error: () => {
          this.requests.set([]);
          this.error.set('Could not load join requests.');
          this.loading.set(false);
        },
      });
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) return;

    this.pageNumber.update((page) => page + 1);

    this.loadRequests();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) return;

    this.pageNumber.update((page) => page - 1);

    this.loadRequests();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;

    this.pageNumber.set(page);

    this.loadRequests();
  }

  protected acceptRequest(requestId: string): void {
    this.teamsApi
      .acceptJoinRequest(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.requests.update(requests =>
            requests.map(request =>
              request.id === requestId
                ? { ...request, status: 'Accepted' }
                : request
            )
          );
        },
        error: (err) => {
          console.error('Failed to accept join request:', err);
        }
      });
  }

  protected rejectRequest(requestId: string): void {
    this.teamsApi
      .rejectJoinRequest(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.requests.update(requests =>
            requests.map(request =>
              request.id === requestId
                ? { ...request, status: 'Rejected' }
                : request
            )
          );
        },
        error: (err) => {
          console.error('Failed to reject join request:', err);
        }
      });
  }

  protected viewPortfolio(request: TeamJoinRequest): void {
    void this.router.navigate(['/developer/developers', request.userId]);
  }
}