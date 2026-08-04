import { Component, input } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { CheckmarkCircle02Icon, StarIcon } from '@hugeicons/core-free-icons';

export interface TeamCardPreviewModel {
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  categoryLabel: string;
  about: string;
  specialties: string[];
  skills: string[];
  ownerInitials: string;
  membersCount: number;
}

@Component({
  selector: 'app-team-card-preview',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './team-card-preview.component.html',
})
export class TeamCardPreviewComponent {
  readonly model = input.required<TeamCardPreviewModel>();

  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly checkCircleIcon = CheckmarkCircle02Icon as IconSvgObject;

  protected get preview(): TeamCardPreviewModel {
    return this.model();
  }

  protected get displayName(): string {
    return this.preview.name.trim() || 'Your team name';
  }

  protected get category(): string {
    return this.preview.categoryLabel.trim() || 'Category';
  }

  protected get badgeLabel(): string {
    const full = this.category;
    if (full.length <= 14) return full;
    const words = full.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words[0].length <= 14) return words[0];
    return full.slice(0, 12).trimEnd();
  }

  protected get aboutText(): string {
    return (
      this.preview.about.trim() ||
      'Your team story will appear here. Tell clients what you ship and how you work.'
    );
  }

  protected get specialtyChips(): string[] {
    return this.preview.specialties.slice(0, 3);
  }

  protected get specialtyOverflow(): number {
    return Math.max(this.preview.specialties.length - 3, 0);
  }

  protected get skillChips(): string[] {
    return this.preview.skills.slice(0, 3);
  }

  protected get skillOverflow(): number {
    return Math.max(this.preview.skills.length - 3, 0);
  }

  protected get letter(): string {
    return this.displayName.charAt(0).toUpperCase();
  }

  protected get avatarCount(): number {
    return Math.min(Math.max(this.preview.membersCount, 1), 3);
  }

  protected get overflowMembers(): number {
    return Math.max(this.preview.membersCount - this.avatarCount, 0);
  }
}
