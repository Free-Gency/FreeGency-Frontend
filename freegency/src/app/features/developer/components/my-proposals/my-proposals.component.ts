import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { DeveloperManageWorkService } from '../../data-access/developer-manage-work.service';
import {
  PagedResponse,
  Proposal,
  ProposalStatus,
} from '../../../../shared/models/Proposal';

@Component({
  selector: 'app-my-proposals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-proposals.component.html',
  styleUrl: './my-proposals.component.css',
})
export class MyProposalsComponent {
  private readonly service = inject(DeveloperManageWorkService);
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  readonly statusFilter = signal<ProposalStatus | null>(null);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly search = signal('');

  readonly proposalsResource = rxResource<
    PagedResponse<Proposal>,
    {
      status: ProposalStatus | null;
      page: number;
      search: string;
    }
  >({
    params: () => ({
      status: this.statusFilter(),
      page: this.page(),
      search: this.search(),
    }),
    stream: ({ params }) =>
      this.service.getMyProposals({
        pageNumber: params.page,
        pageSize: this.pageSize,
        status: params.status ?? undefined,
        search: params.search || null,
      }),
  });

  readonly proposals = computed(() => this.proposalsResource.value()?.items ?? []);
  readonly totalPages = computed(() =>
    Math.max(1, this.proposalsResource.value()?.totalPages ?? 1),
  );
  readonly totalCount = computed(() => this.proposalsResource.value()?.totalCount ?? 0);

  setStatusFilter(status: ProposalStatus | null): void {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  onSearchInput(value: string): void {
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.search.set(value.trim());
      this.page.set(1);
    }, 300);
  }

  goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
  }

  statusChipClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Accepted: 'status-accepted',
      Viewed: 'status-viewed',
      InDiscussion: 'status-discussion',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
      Expired: 'status-expired',
    };
    return map[status] ?? 'status-pending';
  }

  statusLabel(status: string): string {
    return status === 'InDiscussion' ? 'IN DISCUSSION' : status.toUpperCase();
  }
}
