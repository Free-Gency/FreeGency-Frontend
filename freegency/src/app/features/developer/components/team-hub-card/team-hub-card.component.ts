import { Component, input, output } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  CheckmarkCircle02Icon,
  MoreHorizontalIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import type { Team, TeamMemberAvatar } from '../../models/team';

export type TeamHubCardVariant = 'discover' | 'mine';

@Component({
  selector: 'app-team-hub-card',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './team-hub-card.component.html',
  styleUrl: './team-hub-card.component.css',
})
export class TeamHubCardComponent {
  readonly team = input.required<Team>();
  readonly variant = input<TeamHubCardVariant>('discover');
  readonly categoryLabel = input('Agency');
  readonly categoryBadge = input('Agency');
  readonly aboutFallback = input(
    'Agile team focused on shipping premium digital experiences for clients.',
  );

  readonly viewTeam = output<Team>();
  readonly openOptions = output<Team>();

  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly checkCircleIcon = CheckmarkCircle02Icon as IconSvgObject;
  protected readonly moreIcon = MoreHorizontalIcon as IconSvgObject;

  protected get t(): Team {
    return this.team();
  }

  protected get displayName(): string {
    return (this.t.name || 'Untitled Team').trim();
  }

  protected get letter(): string {
    return this.displayName.charAt(0).toUpperCase() || 'T';
  }

  protected get about(): string {
    return (this.t.aboutUs || '').trim() || this.aboutFallback();
  }

  protected get coverUrl(): string | null {
    return this.t.cover || null;
  }

  protected get logoUrl(): string | null {
    return this.t.logo || null;
  }

  protected get isMine(): boolean {
    return this.variant() === 'mine';
  }

  protected get roleLabel(): string {
    if (this.t.myRole === 'TeamLeader') return 'Team Leader';
    if (this.t.myRole === 'TeamMember') return 'Member';
    return 'Agency';
  }

  protected get isLeader(): boolean {
    return this.t.myRole === 'TeamLeader';
  }

  /** Stable soft palette per category label (not random each render). */
  protected get categoryTone(): { bg: string; fg: string; border: string } {
    const palette = [
      { bg: '#EEF2FF', fg: '#4338CA', border: '#C7D2FE' }, // indigo
      { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' }, // emerald
      { bg: '#FFF7ED', fg: '#C2410C', border: '#FED7AA' }, // orange
      { bg: '#FDF2F8', fg: '#BE185D', border: '#FBCFE8' }, // pink
      { bg: '#F0F9FF', fg: '#0369A1', border: '#BAE6FD' }, // sky
      { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' }, // amber
      { bg: '#F5F3FF', fg: '#6D28D9', border: '#DDD6FE' }, // violet
      { bg: '#F0FDFA', fg: '#0F766E', border: '#99F6E4' }, // teal
      { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' }, // rose
      { bg: '#F8FAFC', fg: '#475569', border: '#E2E8F0' }, // slate
    ] as const;

    const key = (this.categoryLabel() || 'Agency').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  protected get hasRating(): boolean {
    return this.t.ratingCount > 0 && this.t.averageRating > 0;
  }

  protected get ratingLabel(): string {
    return this.hasRating ? this.t.averageRating.toFixed(1) : 'New';
  }

  protected get projectsLabel(): string {
    const count = this.t.projectsCount ?? 0;
    return count === 1 ? '1 project' : `${count} projects`;
  }

  protected get specialties(): string[] {
    return (this.t.specialties ?? [])
      .map((s) => (s.nameEn || s.nameAr || '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  protected get specialtyOverflow(): number {
    return Math.max((this.t.specialties ?? []).length - 3, 0);
  }

  protected get skills(): string[] {
    return (this.t.skills ?? [])
      .map((s) => (s.name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  protected get skillOverflow(): number {
    return Math.max((this.t.skills ?? []).length - 3, 0);
  }

  protected get avatars(): TeamMemberAvatar[] {
    const list = this.t.memberAvatars ?? [];
    if (list.length) return list.slice(0, 3);

    const count = Math.min(Math.max(this.t.membersCount, this.t.ownerName ? 1 : 0), 3);
    return Array.from({ length: count }, (_, index) => ({
      userId: `${this.t.id}-ph-${index}`,
      name: index === 0 ? this.t.ownerName || 'Member' : 'Member',
      imageUrl: null,
    }));
  }

  protected get overflowMembers(): number {
    return Math.max(this.t.membersCount - this.avatars.length, 0);
  }

  protected avatarInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'M';
  }

  protected onView(): void {
    this.viewTeam.emit(this.t);
  }

  protected onOptions(event: Event): void {
    event.stopPropagation();
    this.openOptions.emit(this.t);
  }
}
