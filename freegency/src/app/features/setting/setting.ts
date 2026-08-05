import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  CreditCardIcon,
  DangerIcon,
  IdentityCardIcon,
  LockPasswordIcon,
  Notification02Icon,
  Plug01Icon,
  SecurityLockIcon,
  UserAccountIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../shared/components/developer-view-navbar/developer-view-navbar.component';

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
export class Setting {
  private readonly auth = inject(AuthService);

  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected readonly navItems: SettingNavItem[] = [
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

  protected readonly dangerItem: SettingNavItem = {
    label: 'Danger Zone',
    route: 'danger-zone',
    icon: DangerIcon as IconSvgObject,
    danger: true,
  };
}
