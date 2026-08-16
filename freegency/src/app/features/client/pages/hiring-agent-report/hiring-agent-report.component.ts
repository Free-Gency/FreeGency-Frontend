import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, switchMap, of, catchError } from 'rxjs';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { extractApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  HiringAgentApiService,
  type HiringAgentCandidate,
  type HiringAgentCandidateStatus,
  type HiringAgentRankedDiscussion,
  type HiringAgentReport,
  type HiringAgentRun,
  type HiringAgentRunStatus,
} from '../../data-access/hiring-agent-api.service';
import {
  formatRemaining,
  progressRatio,
  remainingMs,
} from '../../utils/hiring-agent-countdown';

const ACTIVE_STATUSES: HiringAgentRunStatus[] = [
  'Queued',
  'Inviting',
  'WaitingAccepts',
  'Discussing',
  'Ranking',
];

type ProcessPhase = 'Matching' | 'Waiting' | 'Discussing' | 'Ranking' | 'Ready';

@Component({
  selector: 'app-hiring-agent-report',
  standalone: true,
  imports: [ClientViewNavbarComponent, RouterLink, DatePipe, DecimalPipe, NgTemplateOutlet],
  templateUrl: './hiring-agent-report.component.html',
  styleUrl: './hiring-agent-report.component.css',
})
export class HiringAgentReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hiringAgentApi = inject(HiringAgentApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly run = signal<HiringAgentRun | null>(null);
  protected readonly report = signal<HiringAgentReport | null>(null);
  protected readonly error = signal('');
  protected readonly nowMs = signal(Date.now());
  /** Client can override the AI recommendation before hiring. */
  protected readonly selectedCandidateId = signal<string | null>(null);

  protected readonly isReportReady = computed(() => {
    const s = this.run()?.status;
    return s === 'ReportReady' || s === 'Hired' || s === 'Dismissed';
  });
  protected readonly canHire = computed(
    () => this.run()?.status === 'ReportReady' && !this.run()?.clientHireApprovedAt,
  );
  protected readonly isAgentRefiningPlan = computed(
    () => this.run()?.status === 'ReportReady' && !!this.run()?.clientHireApprovedAt,
  );
  protected readonly isActive = computed(() => {
    const status = this.run()?.status;
    return !!status && ACTIVE_STATUSES.includes(status);
  });
  protected readonly canCancel = computed(() => this.isActive());

  protected readonly sortedCandidates = computed(() => {
    const list = [...(this.run()?.candidates ?? [])];
    return list.sort((a, b) => {
      if (a.rankOrder && b.rankOrder) return a.rankOrder - b.rankOrder;
      return (b.discussionScore ?? b.suggestionScore) - (a.discussionScore ?? a.suggestionScore);
    });
  });

  /** Discussions that were already open when Scout started (no invite sent). */
  protected readonly existingDiscussionCandidates = computed(() =>
    this.sortedCandidates().filter((c) => this.isExistingDiscussion(c)),
  );

  /** Applicants Scout attached without inviting (applied + AI match, not yet discussing). */
  protected readonly appliedRecommendedCandidates = computed(() =>
    this.sortedCandidates().filter((c) => this.isAppliedRecommended(c)),
  );

  /** Fresh Scout invites only. */
  protected readonly scoutInviteCandidates = computed(() =>
    this.sortedCandidates().filter((c) => this.isScoutInvite(c)),
  );

  protected readonly responseSummary = computed(() => {
    const candidates = this.run()?.candidates ?? [];
    let accepted = 0;
    let pending = 0;
    let declined = 0;
    for (const c of candidates) {
      if (
        c.status === 'Accepted' ||
        c.status === 'Discussing' ||
        c.status === 'PlanProposed' ||
        c.status === 'Ranked'
      ) {
        accepted++;
      } else if (c.status === 'Invited' || c.status === 'Suggested') {
        pending++;
      } else if (
        c.status === 'Rejected' ||
        c.status === 'Expired' ||
        c.status === 'InviteFailed'
      ) {
        declined++;
      }
    }
    return { accepted, pending, declined, total: candidates.length };
  });

  protected readonly hasPendingInvites = computed(() =>
    (this.run()?.candidates ?? []).some((c) => c.status === 'Invited'),
  );

  protected readonly canCloseInvites = computed(() => {
    const run = this.run();
    if (!run) return false;
    if (run.status !== 'WaitingAccepts' && run.status !== 'Discussing') return false;
    return (run.candidates ?? []).some(
      (c) =>
        !!c.chatRoomId &&
        (c.status === 'Accepted' ||
          c.status === 'Discussing' ||
          c.status === 'PlanProposed'),
    );
  });

  protected readonly activeDeadlineIso = computed(() => {
    const run = this.run();
    if (!run || !this.isActive()) return null;
    const status = run.status;
    if (
      status === 'Queued' ||
      status === 'Inviting' ||
      status === 'WaitingAccepts' ||
      this.hasPendingInvites()
    ) {
      return run.inviteDeadlineUtc;
    }
    return run.discussionDeadlineUtc;
  });

  protected readonly countdownLabel = computed(() => {
    const run = this.run();
    const deadline = this.activeDeadlineIso();
    if (!run || !deadline) return null;
    const left = remainingMs(deadline, this.nowMs());
    const isInvitePhase =
      run.status === 'Queued' ||
      run.status === 'Inviting' ||
      run.status === 'WaitingAccepts' ||
      this.hasPendingInvites();
    return {
      title: isInvitePhase ? 'Invites close in' : 'Discussion ends in',
      remaining: formatRemaining(left),
      ratio: progressRatio(run.createdAt, deadline, this.nowMs()),
      expired: left <= 0,
    };
  });

  protected readonly phases = computed(() => {
    const status = this.run()?.status ?? 'Queued';
    const order: ProcessPhase[] = ['Matching', 'Waiting', 'Discussing', 'Ranking', 'Ready'];
    const currentIndex = (() => {
      switch (status) {
        case 'Queued':
        case 'Inviting':
          return 0;
        case 'WaitingAccepts':
          return 1;
        case 'Discussing':
          return 2;
        case 'Ranking':
          return 3;
        case 'ReportReady':
        case 'Hired':
        case 'Dismissed':
          return 4;
        default:
          return 0;
      }
    })();

    return order.map((label, index) => ({
      label,
      index: index + 1,
      state: (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo') as
        | 'done'
        | 'current'
        | 'todo',
    }));
  });

  protected readonly winnerRanked = computed((): HiringAgentRankedDiscussion | null => {
    const report = this.report();
    const recommended = report?.recommended;
    if (!report || !recommended) return report?.rankedDiscussions?.[0] ?? null;
    return (
      report.rankedDiscussions.find((r) => r.candidateId === recommended.id) ??
      report.rankedDiscussions[0] ??
      null
    );
  });

  protected readonly rankedCards = computed(() => {
    const report = this.report();
    const run = this.run();
    if (!report?.rankedDiscussions?.length) return [];

    const byId = new Map((run?.candidates ?? []).map((c) => [c.id, c]));
    const recommendedId = report.recommended?.id ?? null;

    return [...report.rankedDiscussions]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => {
        const candidate = byId.get(item.candidateId) ?? null;
        const hasPlan =
          item.hasMilestonePlan || !!item.planVersionId || !!candidate?.latestPlanVersionId;
        return {
          item,
          candidate,
          isRecommended: item.candidateId === recommendedId,
          displayName: item.displayName || candidate?.displayName || 'Candidate',
          avatarUrl: candidate?.avatarUrl ?? null,
          inviteeType: candidate?.inviteeType ?? 'User',
          chatRoomId: item.chatRoomId || candidate?.chatRoomId || null,
          hasPlan,
          criteria: this.buildRankingCriteria(item, hasPlan),
        };
      });
  });

  protected readonly rankingRubric = [
    {
      key: 'work',
      label: 'Work & plan',
      detail: 'Milestone clarity, deliverables, and scope understanding.',
    },
    {
      key: 'budget',
      label: 'Budget fit',
      detail: 'Amounts vs project budget and pricing discipline.',
    },
    {
      key: 'comms',
      label: 'Communication',
      detail: 'Responsiveness, professionalism, and negotiation quality.',
    },
    {
      key: 'timeline',
      label: 'Timeline',
      detail: 'Due dates, pacing, and ability to hit delivery windows.',
    },
  ] as const;

  protected readonly winnerCard = computed(() => {
    const cards = this.rankedCards();
    if (!cards.length) return null;
    return cards.find((c) => c.isRecommended) ?? cards[0];
  });

  protected readonly runnerUpCards = computed(() => {
    const winnerId = this.winnerCard()?.item.candidateId;
    return this.rankedCards().filter((c) => c.item.candidateId !== winnerId);
  });

  /** Invitation outcomes for the run roster. */
  protected readonly inviteOutcomes = computed(() => {
    const candidates = this.run()?.candidates ?? [];
    const accepted = candidates.filter((c) =>
      ['Accepted', 'Discussing', 'PlanProposed', 'Ranked'].includes(c.status),
    );
    const rejected = candidates.filter((c) => c.status === 'Rejected');
    const noReply = candidates.filter((c) =>
      ['Invited', 'Suggested', 'Expired'].includes(c.status),
    );
    const failed = candidates.filter((c) => c.status === 'InviteFailed');
    const names = (list: typeof candidates) => list.map((c) => c.displayName);

    return {
      total: candidates.length,
      accepted,
      rejected,
      noReply,
      failed,
      acceptedNames: names(accepted),
      rejectedNames: names(rejected),
      noReplyNames: names(noReply),
      failedNames: names(failed),
    };
  });

  /** Story of what the AI and candidates did during this run. */
  protected readonly aiTimeline = computed(() => {
    const run = this.run();
    if (!run) return [];

    type Tone = 'system' | 'ai' | 'talent' | 'hire' | 'warn';
    const events: {
      id: string;
      title: string;
      detail: string;
      at: string | null;
      tone: Tone;
    }[] = [];

    const outcomes = this.inviteOutcomes();
    const candidates = run.candidates ?? [];
    const withAgent = candidates
      .filter((c) => (c.agentMessageCount ?? 0) > 0)
      .sort((a, b) => (b.agentMessageCount ?? 0) - (a.agentMessageCount ?? 0));
    const withPlan = candidates.filter(
      (c) => !!c.latestPlanVersionId || c.status === 'PlanProposed' || c.status === 'Ranked',
    );
    const totalAiMsgs = candidates.reduce((sum, c) => sum + (c.agentMessageCount ?? 0), 0);
    const listNames = (names: string[], limit = 6) => {
      if (!names.length) return '';
      const shown = names.slice(0, limit).join(', ');
      return names.length > limit ? `${shown} (+${names.length - limit} more)` : shown;
    };

    events.push({
      id: 'started',
      title: 'Run started',
      detail: `Scout opened for “${run.projectTitle || 'this project'}”.`,
      at: run.createdAt,
      tone: 'system',
    });

    if (outcomes.total > 0) {
      events.push({
        id: 'invites',
        title: 'Invitations sent',
        detail: `${outcomes.total} invite${outcomes.total === 1 ? '' : 's'} went out: ${listNames(
          candidates.map((c) => c.displayName),
        )}.`,
        at: run.createdAt,
        tone: 'system',
      });
    }

    if (outcomes.accepted.length) {
      events.push({
        id: 'accepts',
        title: 'Accepted',
        detail: `${outcomes.accepted.length} replied yes — ${listNames(outcomes.acceptedNames)}.`,
        at: null,
        tone: 'talent',
      });
    }

    if (outcomes.rejected.length) {
      events.push({
        id: 'rejected',
        title: 'Declined',
        detail: `${outcomes.rejected.length} rejected the invite — ${listNames(outcomes.rejectedNames)}.`,
        at: null,
        tone: 'warn',
      });
    }

    if (outcomes.noReply.length) {
      events.push({
        id: 'no-reply',
        title: 'No reply',
        detail: `${outcomes.noReply.length} never responded (pending or expired) — ${listNames(
          outcomes.noReplyNames,
        )}.`,
        at: null,
        tone: 'warn',
      });
    }

    if (outcomes.failed.length) {
      events.push({
        id: 'invite-failed',
        title: 'Invite failed',
        detail: `${outcomes.failed.length} invite${outcomes.failed.length === 1 ? '' : 's'} could not be delivered — ${listNames(
          outcomes.failedNames,
        )}.`,
        at: null,
        tone: 'warn',
      });
    }

    if (totalAiMsgs > 0) {
      events.push({
        id: 'ai-chat',
        title: 'AI negotiation',
        detail: `Hiring agent sent ${totalAiMsgs} message${totalAiMsgs === 1 ? '' : 's'} across chats to clarify scope, budget, and milestone plans.`,
        at: null,
        tone: 'ai',
      });
    }

    for (const c of withAgent.slice(0, 4)) {
      const note = c.discussionNotes?.trim();
      events.push({
        id: `ai-${c.id}`,
        title: `AI ↔ ${c.displayName}`,
        detail: `${c.agentMessageCount} agent message${c.agentMessageCount === 1 ? '' : 's'}${
          note ? ` — ${note.slice(0, 110)}${note.length > 110 ? '…' : ''}` : '.'
        }`,
        at: null,
        tone: 'ai',
      });
    }

    if (withPlan.length) {
      events.push({
        id: 'plans',
        title: 'Milestone plans collected',
        detail: `${withPlan.length} plan${withPlan.length === 1 ? '' : 's'} submitted (${listNames(
          withPlan.map((c) => c.displayName),
          3,
        )}).`,
        at: null,
        tone: 'talent',
      });
    }

    if (run.reportReadyAt || run.status === 'ReportReady' || run.status === 'Hired') {
      const winner = this.winnerCard();
      events.push({
        id: 'ranked',
        title: 'Ranking complete',
        detail: winner
          ? `AI ranked discussions. Top pick: ${winner.displayName} (${this.scoreOutOfTen(winner.item.score)}).`
          : 'AI finished ranking accepted discussions.',
        at: run.reportReadyAt,
        tone: 'ai',
      });
    }

    if (run.clientHireApprovedAt) {
      const pick = this.focusCandidateForTimeline(run);
      events.push({
        id: 'hire-approved',
        title: 'Client approved hire',
        detail: pick
          ? `You confirmed ${pick.displayName}. Agent continued refining the milestone plan.`
          : 'You confirmed the hire. Agent continued plan refinement.',
        at: run.clientHireApprovedAt,
        tone: 'hire',
      });
    }

    if (run.status === 'Hired') {
      const pick = this.focusCandidateForTimeline(run);
      events.push({
        id: 'hired',
        title: 'Hire complete',
        detail: pick
          ? `${pick.displayName} was hired and assigned to the project.`
          : 'Talent was hired and assigned to the project.',
        at: run.completedAt,
        tone: 'hire',
      });
    } else if (run.status === 'Dismissed') {
      events.push({
        id: 'dismissed',
        title: 'Report dismissed',
        detail: 'This run was closed without hiring.',
        at: run.completedAt,
        tone: 'system',
      });
    } else if (run.status === 'Cancelled' || run.status === 'Failed') {
      events.push({
        id: 'ended',
        title: run.status === 'Failed' ? 'Run failed' : 'Run cancelled',
        detail: run.failureReason?.trim() || 'The Scout run ended early.',
        at: run.completedAt,
        tone: 'system',
      });
    }

    return events;
  });

  private focusCandidateForTimeline(run: HiringAgentRun) {
    const list = run.candidates ?? [];
    if (run.recommendedCandidateId) {
      const match = list.find((c) => c.id === run.recommendedCandidateId);
      if (match) return match;
    }
    return this.winnerCard()?.candidate ?? list[0] ?? null;
  }

  protected readonly selectedRanked = computed(() => {
    const cards = this.rankedCards();
    if (!cards.length) return null;
    const selectedId =
      this.selectedCandidateId() ??
      this.report()?.recommended?.id ??
      cards[0]?.item.candidateId ??
      null;
    return cards.find((c) => c.item.candidateId === selectedId) ?? cards[0];
  });

  protected selectCandidate(candidateId: string): void {
    if (!this.canHire()) return;
    this.selectedCandidateId.set(candidateId);
  }

  protected confirmHire(candidateId?: string | null): void {
    const run = this.run();
    if (!run || this.actionLoading()) return;
    const selectedId =
      candidateId ??
      this.selectedCandidateId() ??
      this.report()?.recommended?.id ??
      this.selectedRanked()?.item?.candidateId ??
      null;

    this.actionLoading.set(true);
    this.hiringAgentApi.confirmHire(run.id, selectedId).subscribe({
      next: (message) => {
        this.actionLoading.set(false);
        this.toast.success(
          message || 'Hire confirmed. The recommended talent has been selected.',
        );
        this.loadRun(run.id);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(extractApiError(err, 'Could not confirm hire.'));
      },
    });
  }

  ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('runId');
    if (!runId) {
      void this.router.navigateByUrl('/client/reports');
      return;
    }

    this.loadRun(runId);

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.nowMs.set(Date.now()));

    interval(5000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          const current = this.run();
          if (!current) return of(null);
          // Poll while matching/discussing, and while agent refines plan after hire approval.
          const shouldPoll =
            ACTIVE_STATUSES.includes(current.status) ||
            (current.status === 'ReportReady' && !!current.clientHireApprovedAt);
          if (!shouldPoll) return of(null);
          return this.hiringAgentApi.getRun(current.id).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.run.set(updated);
        if (updated.status === 'ReportReady' || updated.status === 'Hired') {
          this.loadReport(updated.id);
        }
      });
  }

  protected openChat(roomId: string | null | undefined): void {
    if (!roomId) return;
    void this.router.navigate(['/client/messages'], { queryParams: { room: roomId } });
  }

  protected scoreOutOfTen(score: number | null | undefined): string {
    if (score == null || Number.isNaN(score)) return '—';
    const normalized = score <= 1 ? score * 10 : score;
    return `${normalized.toFixed(1)}/10`;
  }

  private buildRankingCriteria(
    item: HiringAgentRankedDiscussion,
    hasPlan: boolean,
  ): { key: string; label: string; pct: number; note: string }[] {
    const strengths = (item.strengths ?? []).map((s) => s.toLowerCase());
    const weaknesses = (item.weaknesses ?? []).map((w) => w.toLowerCase());
    const summary = (item.summary ?? '').toLowerCase();
    const blob = [...strengths, ...weaknesses, summary].join(' ');
    const base = Math.max(0, Math.min(1, item.score <= 1 ? item.score : item.score / 10));

    const hit = (pool: string[], keys: RegExp) => pool.some((t) => keys.test(t));
    const workPos = hit(strengths, /plan|milestone|deliver|scope|work|ux|ui|handoff|skill|quality/);
    const workNeg = hit(weaknesses, /plan|milestone|deliver|scope|vague|misalign|incomplete/);
    const budgetPos = hit(strengths, /budget|amount|price|cost|within|align/);
    const budgetNeg = hit(weaknesses, /budget|amount|price|cost|over|expensive|under|premium/);
    const commsPos = hit(strengths, /communicat|respons|profession|clear|engag/);
    const commsNeg = hit(
      weaknesses,
      /communicat|unprofession|poor|ghost|silence|rude|behavior|conduct/,
    );
    const timePos = hit(strengths, /timeline|due|schedule|deadline|availab|start|pace|delivery/);
    const timeNeg = hit(weaknesses, /timeline|due|schedule|deadline|delay|late|misalign|rushed/);

    const workPct = this.clampPct(
      base * 100 * 0.55 + (hasPlan ? 28 : 8) + (workPos ? 14 : 0) - (workNeg ? 22 : 0),
    );
    const budgetPct = this.clampPct(
      base * 100 * 0.5 +
        (budgetPos ? 32 : 18) -
        (budgetNeg ? 28 : 0) +
        (/align with the budget|within budget/.test(blob) ? 12 : 0),
    );
    const commsPct = this.clampPct(
      base * 100 * 0.45 + (commsPos ? 30 : 16) - (commsNeg ? 34 : 0),
    );
    const timelinePct = this.clampPct(
      base * 100 * 0.48 +
        (hasPlan ? 18 : 6) +
        (timePos ? 22 : 12) -
        (timeNeg ? 28 : 0) +
        (/due date|timeline/.test(blob) && timeNeg ? -10 : 0),
    );

    return [
      {
        key: 'work',
        label: 'Work & plan',
        pct: workPct,
        note: hasPlan
          ? workNeg
            ? 'Plan needs clearer work breakdown'
            : 'Milestone plan supports the scope'
          : 'No milestone plan submitted',
      },
      {
        key: 'budget',
        label: 'Budget fit',
        pct: budgetPct,
        note: budgetNeg
          ? 'Pricing or amounts need attention'
          : budgetPos
            ? 'Amounts align with project budget'
            : 'Budget signals mixed / limited',
      },
      {
        key: 'comms',
        label: 'Communication',
        pct: commsPct,
        note: commsNeg
          ? 'Communication or professionalism flagged'
          : commsPos
            ? 'Solid discussion quality'
            : 'Average discussion signal',
      },
      {
        key: 'timeline',
        label: 'Timeline',
        pct: timelinePct,
        note: timeNeg
          ? 'Dates or pacing need correction'
          : timePos
            ? 'Delivery timing looks realistic'
            : hasPlan
              ? 'Timeline present but lightly signaled'
              : 'No timeline signal yet',
      },
    ];
  }

  protected criterionTags(card: {
    item: HiringAgentRankedDiscussion;
    hasPlan: boolean;
    inviteeType: string;
  }): string[] {
    const tags: string[] = [];
    if (card.inviteeType === 'Team') tags.push('Team');
    else tags.push('Developer');
    if (card.hasPlan) tags.push('Plan');
    const top = [...(card.item.strengths ?? [])]
      .slice(0, 2)
      .map((s) => s.split(/[,.]/)[0]?.trim())
      .filter((s): s is string => !!s && s.length <= 28);
    for (const t of top) {
      if (tags.length >= 4) break;
      tags.push(t.toUpperCase());
    }
    return tags;
  }

  private clampPct(value: number): number {
    return Math.round(Math.max(8, Math.min(98, value)));
  }

  protected activityLine(candidate: HiringAgentCandidate): string {
    if (this.isExistingDiscussion(candidate)) {
      return candidate.agentMessageCount > 0
        ? 'Scout continues this discussion'
        : 'Discussion already open';
    }
    if (this.isAppliedRecommended(candidate)) {
      return candidate.chatRoomId
        ? 'Applied + AI match — discussion available'
        : 'Applied + AI match — no invite sent';
    }
    switch (candidate.status) {
      case 'Discussing':
        return candidate.agentMessageCount > 0
          ? 'Scout is chatting'
          : 'Waiting for first reply';
      case 'PlanProposed':
        return 'Milestone plan submitted';
      case 'Accepted':
        return 'Invite accepted — starting chat';
      case 'Invited':
      case 'Suggested':
        return 'Invite sent — waiting on reply';
      case 'Ranked':
        return 'Discussion ranked';
      case 'Rejected':
        return 'Declined invitation';
      case 'Expired':
        return 'Invite expired — no reply';
      case 'InviteFailed':
        return 'Invite failed';
      default:
        return this.statusLabel(candidate.status);
    }
  }

  protected rosterBadgeClass(status: HiringAgentCandidateStatus): string {
    switch (status) {
      case 'Discussing':
      case 'PlanProposed':
      case 'Ranked':
      case 'Accepted':
        return 'ha-badge ha-badge--ok';
      case 'Invited':
      case 'Suggested':
        return 'ha-badge ha-badge--wait';
      case 'Rejected':
      case 'Expired':
      case 'InviteFailed':
        return 'ha-badge ha-badge--bad';
      default:
        return 'ha-badge';
    }
  }

  protected closeInvites(): void {
    const run = this.run();
    if (!run || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.hiringAgentApi.closeInvites(run.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.run.set(updated);
        this.toast.success('Finishing early. Ranking candidates who already accepted…');
        if (updated.status === 'ReportReady') {
          this.loadReport(updated.id);
        }
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(extractApiError(err, 'Could not close invites.'));
      },
    });
  }

  protected dismiss(): void {
    const run = this.run();
    if (!run || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.hiringAgentApi.dismiss(run.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Report dismissed.');
        this.loadRun(run.id);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(extractApiError(err, 'Could not dismiss report.'));
      },
    });
  }

  protected cancelRun(): void {
    const run = this.run();
    if (!run || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.hiringAgentApi.cancel(run.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Hiring agent run cancelled.');
        this.loadRun(run.id);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(extractApiError(err, 'Could not cancel run.'));
      },
    });
  }

  protected candidateInitials(candidate: { displayName: string }): string {
    const parts = candidate.displayName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  protected isExistingDiscussion(c: HiringAgentCandidate): boolean {
    if (c.sourceGroup === 'existing-discussion') return true;
    if (c.invitationId) return false;
    return (
      !!c.proposalId &&
      (c.status === 'Discussing' || c.status === 'PlanProposed' || c.status === 'Ranked')
    );
  }

  protected isAppliedRecommended(c: HiringAgentCandidate): boolean {
    if (this.isExistingDiscussion(c)) return false;
    if (c.sourceGroup === 'applied-and-recommended') return true;
    return !!c.proposalId && !c.invitationId && c.status === 'Accepted';
  }

  protected isScoutInvite(c: HiringAgentCandidate): boolean {
    return !this.isExistingDiscussion(c) && !this.isAppliedRecommended(c);
  }

  protected rosterStatusLabel(candidate: HiringAgentCandidate): string {
    if (this.isExistingDiscussion(candidate)) return 'In discussion';
    if (this.isAppliedRecommended(candidate)) return 'Applied + AI';
    return this.statusLabel(candidate.status);
  }

  protected statusLabel(status: HiringAgentRunStatus | HiringAgentCandidateStatus): string {
    switch (status) {
      case 'WaitingAccepts':
        return 'Waiting';
      case 'ReportReady':
        return 'Report ready';
      case 'PlanProposed':
        return 'Plan in';
      case 'InviteFailed':
        return 'Invite failed';
      case 'Invited':
        return 'Pending';
      case 'Discussing':
        return 'Discussing';
      case 'Accepted':
        return 'Accepted';
      case 'Rejected':
        return 'Declined';
      case 'Expired':
        return 'No reply';
      default:
        return status;
    }
  }

  private loadRun(runId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.hiringAgentApi.getRun(runId).subscribe({
      next: (run) => {
        this.run.set(run);
        this.loading.set(false);
        if (run.status === 'ReportReady' || run.status === 'Hired' || run.status === 'Dismissed') {
          this.loadReport(run.id);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Could not load this hiring agent run.'));
      },
    });
  }

  private loadReport(runId: string): void {
    this.hiringAgentApi.getReport(runId).subscribe({
      next: (report) => {
        this.report.set(report);
        if (!this.selectedCandidateId() && report.recommended?.id) {
          this.selectedCandidateId.set(report.recommended.id);
        } else if (!this.selectedCandidateId() && report.rankedDiscussions[0]?.candidateId) {
          this.selectedCandidateId.set(report.rankedDiscussions[0].candidateId);
        }
      },
      error: () => this.report.set(null),
    });
  }
}
