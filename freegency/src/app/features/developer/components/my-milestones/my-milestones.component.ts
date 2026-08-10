import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { DeveloperManageWorkService } from '../../data-access/developer-manage-work.service';
import { DeveloperMilestone } from '../../models/developer-milestone';
import {
  SubmitWorkModalComponent,
  SubmitWorkMilestoneOption,
} from '../../../project/components/submit-work-modal/submit-work-modal.component';

export interface MilestoneProjectNavItem {
  projectId: string;
  title: string;
  count: number;
  needsActionCount: number;
}

@Component({
  selector: 'app-my-milestones',
  standalone: true,
  imports: [CommonModule, SubmitWorkModalComponent],
  templateUrl: './my-milestones.component.html',
})
export class MyMilestonesComponent {
  private readonly service = inject(DeveloperManageWorkService);
  private readonly router = inject(Router);

  readonly milestones = rxResource<DeveloperMilestone[], void>({
    stream: () => this.service.getMyMilestones(),
  });

  readonly list = computed(() => this.milestones.value() ?? []);
  /** `null` = all projects */
  readonly selectedProjectId = signal<string | null>(null);
  readonly search = signal('');

  readonly submitOpen = signal(false);
  readonly submitMilestoneId = signal<string | null>(null);
  readonly submitProjectId = signal<string | null>(null);
  readonly submitIsRevision = signal(false);

  readonly projects = computed<MilestoneProjectNavItem[]>(() => {
    const map = new Map<string, MilestoneProjectNavItem>();
    for (const m of this.list()) {
      const existing = map.get(m.projectId);
      if (existing) {
        existing.count += 1;
        if (this.canSubmitNow(m)) existing.needsActionCount += 1;
      } else {
        map.set(m.projectId, {
          projectId: m.projectId,
          title: m.projectTitle,
          count: 1,
          needsActionCount: this.canSubmitNow(m) ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  });

  readonly selectedProjectTitle = computed(() => {
    const id = this.selectedProjectId();
    if (!id) return null;
    return this.projects().find((p) => p.projectId === id)?.title ?? null;
  });

  readonly needsActionCount = computed(
    () => this.list().filter((m) => this.canSubmitNow(m)).length,
  );

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const projectId = this.selectedProjectId();
    let items = this.list();

    if (projectId) {
      items = items.filter((m) => m.projectId === projectId);
    }

    if (q) {
      items = items.filter(
        (m) =>
          m.projectTitle.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q),
      );
    }

    return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly submitOptions = computed<SubmitWorkMilestoneOption[]>(() => {
    const projectId = this.submitProjectId() ?? this.selectedProjectId();
    return this.list()
      .filter(
        (m) =>
          this.canSubmitNow(m) && (!projectId || m.projectId === projectId),
      )
      .map((m) => ({
        id: m.id,
        projectId: m.projectId,
        title: m.title,
        sortOrder: m.sortOrder,
        amount: m.amount,
        currency: 'USD',
      }));
  });

  readonly activeEscrow = computed(() =>
    this.list()
      .filter((m) => m.isFunded && m.releaseStatus !== 'Released')
      .reduce((s, m) => s + m.amount, 0),
  );

  readonly pendingReview = computed(() =>
    this.list()
      .filter((m) => m.workStatus === 'Submitted')
      .reduce((s, m) => s + m.amount, 0),
  );

  readonly activeBarPercent = computed(() =>
    Math.min(100, this.list().length * 20),
  );

  /** True when API allows submit (funded + in progress / changes requested). */
  canSubmitNow(m: DeveloperMilestone): boolean {
    return (
      m.canSubmit &&
      m.isFunded &&
      (m.workStatus === 'InProgress' || m.workStatus === 'ChangesRequested')
    );
  }

  selectProject(projectId: string | null): void {
    this.selectedProjectId.set(projectId);
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  openSubmit(m: DeveloperMilestone): void {
    if (!this.canSubmitNow(m)) return;
    this.submitMilestoneId.set(m.id);
    this.submitProjectId.set(m.projectId);
    this.submitIsRevision.set(m.workStatus === 'ChangesRequested');
    this.submitOpen.set(true);
  }

  closeSubmit(): void {
    this.submitOpen.set(false);
    this.submitProjectId.set(null);
  }

  onSubmitted(): void {
    this.milestones.reload();
  }

  openProject(projectId: string): void {
    void this.router.navigate(['/projects', projectId], {
      queryParams: { tab: 'milestones' },
    });
  }

  openChat(projectId: string): void {
    void this.router.navigate(['/developer/messages'], {
      queryParams: { project: projectId },
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  isOverdue(m: DeveloperMilestone): boolean {
    if (!m.dueDate || m.workStatus === 'Submitted' || m.releaseStatus === 'Released') {
      return false;
    }
    return new Date(m.dueDate).getTime() < Date.now();
  }

  roleLabel(m: DeveloperMilestone): string {
    return m.canSubmit ? 'Ready to submit' : 'Assignee';
  }
}
