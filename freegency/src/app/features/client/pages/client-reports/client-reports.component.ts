import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { extractApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  HiringAgentApiService,
  type HiringAgentCandidate,
  type HiringAgentRun,
  type HiringAgentRunStatus,
} from '../../data-access/hiring-agent-api.service';
import { formatShortRemaining, remainingMs } from '../../utils/hiring-agent-countdown';

const ACTIVE_STATUSES: HiringAgentRunStatus[] = [
  'Queued',
  'Inviting',
  'WaitingAccepts',
  'Discussing',
  'Ranking',
];

@Component({
  selector: 'app-client-reports',
  standalone: true,
  imports: [ClientViewNavbarComponent, RouterLink, DatePipe],
  templateUrl: './client-reports.component.html',
  styleUrl: './client-reports.component.css',
})
export class ClientReportsComponent implements OnInit {
  private readonly hiringAgentApi = inject(HiringAgentApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly runs = signal<HiringAgentRun[]>([]);
  protected readonly nowMs = signal(Date.now());

  protected readonly activeRuns = computed(() =>
    this.runs().filter((r) => ACTIVE_STATUSES.includes(r.status)),
  );
  protected readonly pastRuns = computed(() =>
    this.runs().filter((r) => !ACTIVE_STATUSES.includes(r.status)),
  );

  /** UI tab: live runs vs finished history. */
  protected readonly boardTab = signal<'live' | 'history'>('history');

  protected readonly featuredPast = computed(() => {
    const past = this.pastRuns();
    const hired = past.find((r) => r.status === 'Hired');
    return hired ?? past[0] ?? null;
  });

  protected readonly snapshot = computed(() => {
    const active = this.activeRuns();
    let accepted = 0;
    let invited = 0;
    for (const run of active) {
      for (const c of run.candidates ?? []) {
        invited++;
        if (
          c.status === 'Accepted' ||
          c.status === 'Discussing' ||
          c.status === 'PlanProposed' ||
          c.status === 'Ranked'
        ) {
          accepted++;
        }
      }
    }
    return {
      activeCount: active.length,
      pastCount: this.pastRuns().length,
      accepted,
      invited,
    };
  });

  ngOnInit(): void {
    this.loadRuns();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.nowMs.set(Date.now()));
  }

  protected setBoardTab(tab: 'live' | 'history'): void {
    this.boardTab.set(tab);
  }

  protected openRun(run: HiringAgentRun): void {
    void this.router.navigate(['/client/reports/hiring-agent', run.id]);
  }

  protected openChat(roomId: string | null | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!roomId) return;
    void this.router.navigate(['/client/messages'], { queryParams: { room: roomId } });
  }

  protected statusLabel(status: HiringAgentRunStatus): string {
    switch (status) {
      case 'WaitingAccepts':
        return 'Waiting';
      case 'ReportReady':
        return 'Ready to review';
      case 'Queued':
      case 'Inviting':
        return 'Matching';
      default:
        return status;
    }
  }

  protected statusTone(
    status: HiringAgentRunStatus,
  ): 'ok' | 'wait' | 'rank' | 'ready' | 'bad' | 'neutral' {
    switch (status) {
      case 'Discussing':
      case 'Hired':
        return 'ok';
      case 'WaitingAccepts':
      case 'Queued':
      case 'Inviting':
        return 'wait';
      case 'Ranking':
        return 'rank';
      case 'ReportReady':
        return 'ready';
      case 'Failed':
      case 'Cancelled':
      case 'Dismissed':
        return 'bad';
      default:
        return 'neutral';
    }
  }

  protected acceptFraction(run: HiringAgentRun): string {
    const candidates = run.candidates ?? [];
    if (!candidates.length) return '—';
    const accepted = candidates.filter((c) =>
      ['Accepted', 'Discussing', 'PlanProposed', 'Ranked'].includes(c.status),
    ).length;
    return `${accepted}/${candidates.length}`;
  }

  protected timerValue(run: HiringAgentRun): string {
    if (run.status === 'Ranking') return 'Closing…';
    if (!ACTIVE_STATUSES.includes(run.status)) return '—';

    const pending = (run.candidates ?? []).some((c) => c.status === 'Invited');
    const deadline =
      run.status === 'Discussing' || !pending
        ? run.discussionDeadlineUtc
        : run.inviteDeadlineUtc;
    const left = remainingMs(deadline, this.nowMs());
    if (left <= 0) return 'Closing…';
    return formatShortRemaining(left);
  }

  protected pastResult(run: HiringAgentRun): string {
    switch (run.status) {
      case 'ReportReady':
        return run.candidates?.length
          ? `${run.candidates.length} candidates ranked`
          : 'Ready to review';
      case 'Hired':
        return 'Hire confirmed';
      case 'Failed':
        return run.failureReason?.trim() || 'No matches found';
      case 'Cancelled':
        return 'Run cancelled';
      case 'Dismissed':
        return 'Report dismissed';
      default:
        return this.statusLabel(run.status);
    }
  }

  /** Candidate the client hired / AI recommended for this run. */
  protected focusCandidate(run: HiringAgentRun): HiringAgentCandidate | null {
    const list = run.candidates ?? [];
    if (!list.length) return null;
    if (run.recommendedCandidateId) {
      const match = list.find((c) => c.id === run.recommendedCandidateId);
      if (match) return match;
    }
    return (
      [...list].sort((a, b) => {
        if (a.rankOrder && b.rankOrder) return a.rankOrder - b.rankOrder;
        return (b.discussionScore ?? b.suggestionScore) - (a.discussionScore ?? a.suggestionScore);
      })[0] ?? null
    );
  }

  protected scoreOutOfTen(score: number | null | undefined): string {
    if (score == null || Number.isNaN(score)) return '—';
    const normalized = score <= 1 ? score * 10 : score;
    return `${normalized.toFixed(1)}/10`;
  }

  protected candidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  protected aiActivity(run: HiringAgentRun): {
    candidate: HiringAgentCandidate;
    messages: number;
    scoreLabel: string;
    hasPlan: boolean;
    note: string | null;
  } | null {
    const candidate = this.focusCandidate(run);
    if (!candidate) return null;
    const note = candidate.discussionNotes?.trim() || null;
    return {
      candidate,
      messages: candidate.agentMessageCount ?? 0,
      scoreLabel: this.scoreOutOfTen(candidate.discussionScore),
      hasPlan: !!candidate.latestPlanVersionId || candidate.status === 'PlanProposed',
      note: note && note.length > 140 ? `${note.slice(0, 137)}…` : note,
    };
  }

  protected tileTone(index: number): 'lime' | 'ink' | 'sand' {
    const tones = ['lime', 'ink', 'sand'] as const;
    return tones[index % tones.length];
  }

  private loadRuns(): void {
    this.loading.set(true);
    this.hiringAgentApi.listMine().subscribe({
      next: (runs) => {
        this.runs.set(runs);
        this.loading.set(false);
        if (runs.some((r) => ACTIVE_STATUSES.includes(r.status))) {
          this.boardTab.set('live');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(extractApiError(err, 'Could not load hiring agent reports.'));
      },
    });
  }
}
