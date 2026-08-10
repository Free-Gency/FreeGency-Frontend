import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../../core/auth/auth.service';
import { extractApiError } from '../../../../../core/http/api-error';
import { PagedResponse } from '../../../../../shared/models/PagedResponse';
import {
  TeamMemberEarningDto,
  TeamProjectEarningsDto,
} from '../../../../../shared/models/TeamProjectEarningsDto';
import { WalletTeam } from '../../../../../shared/models/WalletTeam';
import { TeamsService } from '../../../data-access/teams.service';

interface MemberProjectRow {
  project: TeamProjectEarningsDto;
  me: TeamMemberEarningDto;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, HugeiconsIconComponent],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent implements OnInit {
  readonly teamId = input.required<string>();
  readonly isTeamLeader = input(false);

  private readonly teamsService = inject(TeamsService);
  private readonly auth = inject(AuthService);

  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly chevronDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly chevronUpIcon = ArrowUp01Icon as IconSvgObject;
  protected readonly arrowIcon = ArrowRight01Icon as IconSvgObject;

  protected readonly projects = signal<TeamProjectEarningsDto[]>([]);
  protected readonly pagination = signal<PagedResponse<TeamProjectEarningsDto> | null>(null);
  protected readonly wallet = signal<WalletTeam | null>(null);

  protected readonly projectsLoading = signal(false);
  protected readonly walletLoading = signal(false);
  protected readonly projectsError = signal<string | null>(null);
  protected readonly walletError = signal<string | null>(null);
  protected readonly expandedProject = signal<string | null>(null);

  protected readonly pageSize = 5;

  protected readonly currency = computed(
    () => this.wallet()?.currency || this.projects()[0]?.currency || 'EGP',
  );

  protected readonly currentUserId = computed(() => this.auth.session()?.id ?? null);

  /** Member: only projects where I appear in payout splits. */
  protected readonly myProjectRows = computed<MemberProjectRow[]>(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    const rows: MemberProjectRow[] = [];
    for (const project of this.projects()) {
      const me = (project.members ?? []).find((m) => m.userId === uid);
      if (me) rows.push({ project, me });
    }
    return rows;
  });

  protected readonly myTotals = computed(() => {
    const rows = this.myProjectRows();
    return {
      budgetShare: rows.reduce((s, r) => s + (Number(r.me.amount) || 0), 0),
      released: rows.reduce((s, r) => s + (Number(r.me.releasedAmount) || 0), 0),
      projects: rows.length,
    };
  });

  protected readonly pageProjectsReleased = computed(() =>
    this.projects().reduce((s, p) => s + (Number(p.releasedAmount) || 0), 0),
  );

  protected readonly pageProjectsBudget = computed(() =>
    this.projects().reduce((s, p) => s + (Number(p.totalBudget) || 0), 0),
  );

  ngOnInit(): void {
    this.loadWallet();
    this.loadProjects(1);
  }

  protected toggleProject(projectId: string): void {
    this.expandedProject.update((current) => (current === projectId ? null : projectId));
  }

  protected releasePercent(project: TeamProjectEarningsDto): number {
    const budget = Number(project.totalBudget) || 0;
    if (budget <= 0) return 0;
    return Math.min(100, Math.round(((Number(project.releasedAmount) || 0) / budget) * 100));
  }

  protected statusClass(status: string | null | undefined): string {
    const s = (status ?? '').toLowerCase();
    if (s.includes('partial')) return 'partial';
    if (s.includes('released')) return 'released';
    return 'pending';
  }

  protected statusLabel(status: string | null | undefined): string {
    const s = (status ?? '').trim();
    if (!s) return 'Pending';
    if (s.toLowerCase() === 'partially released') return 'Partial';
    return s;
  }

  protected changePage(page: number): void {
    const pagination = this.pagination();
    if (!pagination) return;
    if (page < 1 || page > pagination.totalPages) return;
    this.loadProjects(page);
  }

  protected previousPage(): void {
    this.changePage((this.pagination()?.pageNumber ?? 1) - 1);
  }

  protected nextPage(): void {
    this.changePage((this.pagination()?.pageNumber ?? 1) + 1);
  }

  private loadProjects(pageNumber: number): void {
    this.projectsLoading.set(true);
    this.projectsError.set(null);

    this.teamsService
      .getTeamProjectEarnings(this.teamId(), {
        pageNumber,
        pageSize: this.pageSize,
        skipLoading: true,
      })
      .subscribe({
        next: (response) => {
          this.projects.set(response.items ?? []);
          this.pagination.set(response);
          this.projectsLoading.set(false);
          if (this.expandedProject() && !(response.items ?? []).some((p) => p.projectId === this.expandedProject())) {
            this.expandedProject.set(null);
          }
        },
        error: (err) => {
          this.projects.set([]);
          this.pagination.set(null);
          this.projectsError.set(extractApiError(err, 'Could not load project earnings.'));
          this.projectsLoading.set(false);
        },
      });
  }

  private loadWallet(): void {
    this.walletLoading.set(true);
    this.walletError.set(null);
    this.teamsService.getTeamWallet(this.teamId(), { skipLoading: true }).subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.walletLoading.set(false);
      },
      error: (err) => {
        this.wallet.set(null);
        this.walletError.set(extractApiError(err, 'Could not load team wallet.'));
        this.walletLoading.set(false);
      },
    });
  }
}
