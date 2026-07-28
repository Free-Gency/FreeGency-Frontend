import { Component, inject, input, signal, computed, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Idea01Icon } from '@hugeicons/core-free-icons';
import { ManageWorkService } from '../../../data-access/manage-work.service';
import { Proposal } from '../../../../../shared/models/Proposal';
import { Project } from '../../../../../shared/models/Project';

@Component({
  selector: 'app-proposals',
  standalone: true,
  imports: [CommonModule, HugeiconsIconComponent, RouterLink],
  templateUrl: './proposals.html',
})
export class Proposals {
  private readonly manageWorkService = inject(ManageWorkService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ideaIcon = Idea01Icon;

  // Accept projects array from parent
  readonly projects = input<Project[]>([]);

  // Input from route/parent (optional initial selection)
  readonly initialProjectId = input<string>('', { alias: 'projectId' });
  
  // Input for project title to match parent's property binding
  readonly projectTitle = input<string>('');

  // Track selected project ID locally
  readonly selectedProjectId = signal<string | null>(null);

  readonly actionInProgress = signal<string | null>(null);
  readonly aiRankingEnabled = signal(true);

  // Active project ID (defaults to locally selected, route parameter, or first project from parent)
  readonly activeProjectId = computed(() => {
    const list = this.projects();
    return (
      this.selectedProjectId() ||
      this.initialProjectId() ||
      (Array.isArray(list) && list.length > 0 ? list[0].id : '')
    );
  });

  // Load proposals dynamically whenever activeProjectId changes
  readonly proposalsResource = rxResource<Proposal[], { id: string }>({
    params: () => ({ id: this.activeProjectId() }),
    stream: ({ params }) => {
      if (!params.id) return of([]);
      return this.manageWorkService.getProposalsForProject(params.id);
    },
  });

  constructor() {
    effect(() => {
      const initId = this.initialProjectId();
      if (initId) {
        this.selectedProjectId.set(initId);
      }
    });
  }

  selectProject(id: string): void {
    this.selectedProjectId.set(id);
  }

  toggleAiRanking(): void {
    this.aiRankingEnabled.update((v) => !v);
  }

  accept(proposal: Proposal): void {
    this.actionInProgress.set(proposal.id);
    this.manageWorkService.acceptProposal(proposal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionInProgress.set(null);
          this.proposalsResource.reload();
        },
        error: () => this.actionInProgress.set(null),
      });
  }

  reject(proposal: Proposal): void {
    this.actionInProgress.set(proposal.id);
    this.manageWorkService.rejectProposal(proposal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionInProgress.set(null);
          this.proposalsResource.reload();
        },
        error: () => this.actionInProgress.set(null),
      });
  }

  getApplicantDisplayName(proposal: Proposal): string {
    return proposal.applicantType === 'Team'
      ? proposal.teamName ?? 'Unknown team'
      : proposal.applicantName ?? 'Unknown applicant';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getFakeRating(proposal: Proposal): number {
    return 4.5 + (proposal.id.charCodeAt(0) % 5) / 10;
  }

  getFakeReviewCount(proposal: Proposal): number {
    return 20 + (proposal.id.charCodeAt(0) % 100);
  }

  getFakeMatch(proposal: Proposal): number {
    return 85 + (proposal.id.charCodeAt(0) % 15);
  }

  getAvgBid(): number {
    const list: Proposal[] = this.proposalsResource.value() ?? [];
    if (list.length === 0) return 0;
    return list.reduce((sum: number, p: Proposal) => sum + p.proposedBudget, 0) / list.length;
  }
}