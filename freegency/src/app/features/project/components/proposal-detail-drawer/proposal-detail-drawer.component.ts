import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** Minimal shape shared by manage-work + project proposal models. */
export interface ProposalDetailModel {
  id: string;
  projectTitle?: string;
  applicantType: string;
  teamId?: string | null;
  teamName?: string | null;
  userId?: string | null;
  applicantName?: string | null;
  applicantAvatarUrl?: string | null;
  coverLetter: string;
  approach?: string | null;
  proposedTimeline?: string | null;
  similarLinksUrl?: string | null;
  proposedBudget: number;
  status: string;
  rejectReason?: string | null;
  appliedAt: string;
  responseAt?: string | null;
  attachmentUrls?: string[];
  chatRoomId?: string | null;
  skills?: string[] | null;
  specialties?: string[] | null;
}

@Component({
  selector: 'app-proposal-detail-drawer',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './proposal-detail-drawer.component.html',
  styleUrl: './proposal-detail-drawer.component.css',
})
export class ProposalDetailDrawerComponent {
  readonly proposal = input<ProposalDetailModel | null>(null);
  readonly open = input(false);
  readonly busy = input(false);
  readonly canStartDiscussion = input(false);
  readonly canCloseDiscussion = input(false);
  readonly canReject = input(false);
  readonly discussionBlockedHint = input<string | null>(null);

  readonly closed = output<void>();
  readonly startDiscussion = output<string>();
  readonly closeDiscussion = output<string>();
  readonly reject = output<string>();
  readonly goToMessages = output<string>();
  readonly viewProfile = output<{ userId?: string | null; teamId?: string | null; name: string }>();

  protected readonly p = computed(() => this.proposal());

  protected displayName(p: ProposalDetailModel): string {
    return p.applicantName?.trim() || p.teamName?.trim() || 'Applicant';
  }

  protected attachments(p: ProposalDetailModel): string[] {
    return (p.attachmentUrls ?? []).filter((url) => !!url?.trim());
  }

  protected openProfile(p: ProposalDetailModel): void {
    this.viewProfile.emit({
      userId: p.userId ?? null,
      teamId: p.teamId ?? null,
      name: this.displayName(p),
    });
  }

  protected initials(p: ProposalDetailModel): string {
    return this.displayName(p)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected statusLabel(status: string): string {
    if (status === 'InDiscussion') return 'IN DISCUSSION';
    return status.toUpperCase();
  }

  protected statusChipClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Viewed: 'status-viewed',
      InDiscussion: 'status-discussion',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
      Expired: 'status-expired',
    };
    return map[status] ?? 'status-pending';
  }

  protected cleanText(value: string | null | undefined): string {
    if (!value?.trim()) return '';
    return value
      .replace(/\u00C2·/g, '·')
      .replace(/Â·/g, '·')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected skills(p: ProposalDetailModel): string[] {
    return (p.skills ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 10);
  }

  protected specialties(p: ProposalDetailModel): string[] {
    return (p.specialties ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  }

  protected approachTags(p: ProposalDetailModel): string[] {
    if (this.skills(p).length) return [];
    return this.tagsFromApproach(p.approach).slice(0, 8);
  }

  protected tagsFromApproach(approach: string | null | undefined): string[] {
    const cleaned = this.cleanText(approach);
    if (!cleaned) return [];
    return cleaned
      .split(/[·•|,+/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && t.length < 40);
  }

  protected canOpenMessages(p: ProposalDetailModel): boolean {
    return p.status === 'InDiscussion' && !!p.chatRoomId;
  }

  protected onBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
