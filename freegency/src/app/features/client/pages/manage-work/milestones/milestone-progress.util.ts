import { ProjectMilestone } from '../../../../project/models/project-milestone';
import { ProjectEscrow } from '../../../../project/models/project-escrow';

export interface MilestoneProgressSummary {
  total: number;
  releasedCount: number;
  /** 1-based index of current active milestone (releasedCount + 1, capped at total) */
  currentIndex: number;
  /** Milestone completion % (released / total) */
  percent: number;
  escrowRemaining: number;
  escrowTotal: number;
  escrowReleased: number;
  planStatus: string | null;
  /** Next milestone the client can fund, if any */
  nextUnfunded: ProjectMilestone | null;
  /** Milestone awaiting client approve, if any */
  awaitingApproval: ProjectMilestone | null;
  /** Currently funded but not yet released */
  activeFunded: ProjectMilestone | null;
  canFundNext: boolean;
  needsAction: boolean;
}

export function buildMilestoneProgressSummary(
  milestones: ProjectMilestone[],
  escrow: ProjectEscrow | null,
): MilestoneProgressSummary {
  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const total = sorted.length;
  const releasedCount = sorted.filter((m) => m.releaseStatus === 'Released').length;
  const currentIndex = total === 0 ? 0 : Math.min(releasedCount + 1, total);

  const escrowTotal = escrow?.totalAmount ?? 0;
  const escrowReleased = escrow?.totalReleased ?? 0;
  const escrowRemaining =
    escrow?.remaining ?? Math.max(0, escrowTotal - escrowReleased);
  const percent = total === 0 ? 0 : Math.round((releasedCount / total) * 100);

  const awaitingApproval =
    sorted.find(
      (m) => m.workStatus === 'Submitted' && m.releaseStatus === 'Pending',
    ) ?? null;

  const activeFunded =
    sorted.find(
      (m) =>
        m.isFunded &&
        m.releaseStatus !== 'Released' &&
        m.workStatus !== 'Submitted',
    ) ?? null;

  const nextUnfunded = sorted.find((m) => !m.isFunded) ?? null;

  const hasFundedUnreleased = sorted.some(
    (m) => m.isFunded && m.releaseStatus !== 'Released',
  );

  const planAgreed =
    !escrow ||
    escrow.planStatus === 'PlanAgreed' ||
    // After hire, milestones exist even if escrow row is partial
    total > 0;

  const canFundNext =
    planAgreed &&
    !!nextUnfunded &&
    !hasFundedUnreleased &&
    !awaitingApproval;

  const needsAction = canFundNext || !!awaitingApproval;

  return {
    total,
    releasedCount,
    currentIndex,
    percent,
    escrowRemaining,
    escrowTotal,
    escrowReleased,
    planStatus: escrow?.planStatus ?? null,
    nextUnfunded,
    awaitingApproval,
    activeFunded,
    canFundNext,
    needsAction,
  };
}

/** Milestone to highlight on a project card */
export function getPrimaryMilestone(
  summary: MilestoneProgressSummary,
  milestones: ProjectMilestone[],
): ProjectMilestone | null {
  if (summary.awaitingApproval) return summary.awaitingApproval;
  if (summary.activeFunded) return summary.activeFunded;
  if (summary.canFundNext && summary.nextUnfunded) return summary.nextUnfunded;
  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted[sorted.length - 1] ?? null;
}
