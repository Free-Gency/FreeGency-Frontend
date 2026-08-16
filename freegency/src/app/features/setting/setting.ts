import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Alert02Icon,
  CreditCardIcon,
  DangerIcon,
  IdentityCardIcon,
  LockPasswordIcon,
  Notification02Icon,
  Plug01Icon,
  Rocket01Icon,
  SecurityLockIcon,
  UserAccountIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { ModerationStatusService } from './Data-Access/moderation-status.service';

type SettingNavItem = {
  label: string;
  route: string;
  icon: IconSvgObject;
  danger?: boolean;
};

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [
    ClientViewNavbarComponent,
    DeveloperViewNavbarComponent,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HugeiconsIconComponent,
  ],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly moderationApi = inject(ModerationStatusService);

  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected readonly hasGuidelineWarnings = signal(false);

  private readonly baseNavItems: SettingNavItem[] = [
    {
      label: 'Account',
      route: 'account',
      icon: UserAccountIcon as IconSvgObject,
    },
    {
      label: 'Profile mode',
      route: 'profile-mode',
      icon: UserGroupIcon as IconSvgObject,
    },
    {
      label: 'Security',
      route: 'security',
      icon: LockPasswordIcon as IconSvgObject,
    },
    {
      label: 'Notifications',
      route: 'notifications',
      icon: Notification02Icon as IconSvgObject,
    },
    {
      label: 'Payments',
      route: 'payments',
      icon: CreditCardIcon as IconSvgObject,
    },
    {
      label: 'Subscription',
      route: 'subscription',
      icon: Rocket01Icon as IconSvgObject,
    },
    {
      label: 'Privacy',
      route: 'privacy',
      icon: SecurityLockIcon as IconSvgObject,
    },
    {
      label: 'Identity verification',
      route: 'verification',
      icon: IdentityCardIcon as IconSvgObject,
    },
    {
      label: 'Integrations',
      route: 'integrations',
      icon: Plug01Icon as IconSvgObject,
    },
  ];

  private readonly guidelinesItem: SettingNavItem = {
    label: 'Community guidelines',
    route: 'community-guidelines',
    icon: Alert02Icon as IconSvgObject,
  };

  protected readonly navItems = computed(() => {
    if (!this.hasGuidelineWarnings()) return this.baseNavItems;
    const items = [...this.baseNavItems];
    const insertAt = items.findIndex((i) => i.route === 'notifications') + 1;
    items.splice(insertAt > 0 ? insertAt : items.length, 0, this.guidelinesItem);
    return items;
  });

  protected readonly dangerItem: SettingNavItem = {
    label: 'Danger Zone',
    route: 'danger-zone',
    icon: DangerIcon as IconSvgObject,
    danger: true,
  };

  ngOnInit(): void {
    this.moderationApi.getMyStatus().subscribe((status) => {
      this.hasGuidelineWarnings.set(status.hasViolations);
    });
  }
}
