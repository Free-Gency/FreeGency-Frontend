import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Alert02Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import {
  ModerationStatusService,
  type MyModerationStatus,
} from '../Data-Access/moderation-status.service';

@Component({
  selector: 'app-community-guidelines',
  standalone: true,
  imports: [DatePipe, HugeiconsIconComponent],
  templateUrl: './community-guidelines.html',
  styleUrl: './community-guidelines.css',
})
export class CommunityGuidelines implements OnInit {
  private readonly api = inject(ModerationStatusService);

  protected readonly alertIcon = Alert02Icon as IconSvgObject;
  protected readonly shieldIcon = Shield01Icon as IconSvgObject;

  protected readonly loading = signal(true);
  protected readonly status = signal<MyModerationStatus | null>(null);

  ngOnInit(): void {
    this.api.getMyStatus().subscribe({
      next: (s) => {
        this.status.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected sourceLabel(source: string | null | undefined): string {
    const s = (source || '').toLowerCase();
    if (s.includes('chat')) return 'Chat';
    if (s.includes('team')) return 'Team review';
    if (s.includes('developer')) return 'Developer review';
    if (s.includes('portfolio')) return 'Portfolio review';
    return source || 'Content';
  }
}
