import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  OnInit,
  signal,
  
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowDown01Icon,
  BriefcaseDollarIcon,
  CodeIcon,
  HelpCircleIcon,
  Logout01Icon,
  Notification02Icon,
  Search01Icon,
  Settings01Icon,
  Tick02Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../core/auth/auth.service';
import type { UserMode } from '../../../core/auth/auth.models';
import { ProfileApiService } from '../../../features/auth/data-access/profile-api.service';
import { SignalrService } from '../../../core/Signalr/signalr-service';
import { ChatSignalrService } from '../../../core/Signalr/chat-signalr-service';
import {
  PROFILE_MISSING_ERROR,
  ProfileModeService,
} from '../../services/profile-mode.service';
import { NotificationDto } from '../../models/notification';
import { NotificationService } from '../../../features/notification/notification.service';
import { PagedResponse } from '../../models/PagedResponse';
import { NotificationComponent } from '../../../features/notification/notification.component';

export type ClientSearchScope = 'Projects' | 'Talents';

@Component({
  selector: 'app-client-view-navbar',
  imports: [HugeiconsIconComponent, RouterLink, NotificationComponent],
  templateUrl: './client-view-navbar.component.html',
})
export class ClientViewNavbarComponent implements OnInit {
  private readonly profileApi = inject(ProfileApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileMode = inject(ProfileModeService);

  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly notificationIcon = Notification02Icon as IconSvgObject;
  protected readonly checkIcon = Tick02Icon as IconSvgObject;
  protected readonly settingsIcon = Settings01Icon as IconSvgObject;
  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly helpIcon = HelpCircleIcon as IconSvgObject;
  protected readonly logoutIcon = Logout01Icon as IconSvgObject;
  protected readonly clientIcon = BriefcaseDollarIcon as IconSvgObject;
  protected readonly developerIcon = CodeIcon as IconSvgObject;
  signalrService=inject(SignalrService);
  chatSignalrService=inject(ChatSignalrService);
  protected readonly profileImage = this.auth.profileImage;

  protected readonly navItems = [
    { label: 'Hire Talent', dropdown: false, route: '/client/hire-talent' },
    { label: 'Manage Work', dropdown: false, route: '/client/manage-work' },
    { label: 'Reports', dropdown: true, route: null },
    { label: 'Messages', dropdown: false, route: '/client/messages' },
  ] as const;
  
  protected readonly activeNav = signal(this.getActiveLabelFromUrl(this.router.url));
  protected readonly searchScope = signal<ClientSearchScope>('Projects');
  protected readonly searchScopeOpen = signal(false);
  protected readonly accountMenuOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);

  protected readonly searchScopes: readonly ClientSearchScope[] = ['Projects', 'Talents'];
  protected readonly profileModes: readonly UserMode[] = ['Client', 'Developer'];

  protected readonly displayName = computed(() => {
    const session = this.auth.session();
    const full = [session?.firstName, session?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');
    return full || 'Your account';
  });

  protected readonly initials = computed(() => {
    const session = this.auth.session();
    const first = session?.firstName?.trim()?.charAt(0) ?? '';
    const last = session?.lastName?.trim()?.charAt(0) ?? '';
    const value = `${first}${last}`.toUpperCase();
    return value || 'FG';
  });

  protected readonly email = computed(() => this.auth.session()?.email ?? '');
  protected readonly activeMode = computed(
    () => this.auth.session()?.activeProfileMode ?? 'Client',
  );
  protected readonly switchingMode = signal(false);
  protected readonly hasClientProfile = signal(true);
  protected readonly hasDeveloperProfile = signal(false);

  protected readonly canSwitchProfiles = computed(
    () => this.hasClientProfile() && this.hasDeveloperProfile(),
  );

  ngOnInit(): void {
    this.reloadProfileModes();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.activeNav.set(this.getActiveLabelFromUrl(event.urlAfterRedirects));
      });

    this.profileApi
      .getClientProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.auth.setProfileImage(profile.profileImage);
          this.auth.patchSessionNames(profile.firstName, profile.lastName);
        },
        error: () => this.auth.setProfileImage(null),
      });
  }

  protected searchPlaceholder(): string {
    return this.searchScope() === 'Projects' ? 'Search projects' : 'Search talents';
  }

  protected selectNav(item: (typeof this.navItems)[number]): void {
    this.closeMenus();
    this.mobileNavOpen.set(false);
    if (item.route) {
      void this.router.navigate([item.route]);
    }
  }

  protected toggleMobileNav(event: MouseEvent): void {
    event.stopPropagation();
    this.searchScopeOpen.set(false);
    this.accountMenuOpen.set(false);
    this.mobileNavOpen.update((open) => !open);
  }

  protected toggleSearchScope(event: MouseEvent): void {
    event.stopPropagation();
    this.accountMenuOpen.set(false);
    this.searchScopeOpen.update((open) => !open);
  }

  protected selectSearchScope(scope: ClientSearchScope, event: MouseEvent): void {
    event.stopPropagation();
    this.searchScope.set(scope);
    this.searchScopeOpen.set(false);
  }

  protected toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.searchScopeOpen.set(false);
    this.accountMenuOpen.update((open) => !open);
  }

  protected closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  protected selectProfileMode(mode: UserMode, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.canSwitchProfiles()) return;
    if (mode === this.activeMode() || this.switchingMode()) return;

    this.switchingMode.set(true);
    this.profileMode.switchToMode(mode).subscribe({
      next: () => {
        this.switchingMode.set(false);
        this.closeAccountMenu();
      },
      error: (err) => {
        this.switchingMode.set(false);
        if (err instanceof Error && err.message === PROFILE_MISSING_ERROR) {
          this.closeAccountMenu();
          void this.router.navigateByUrl('/settings/profile-mode');
        }
      },
    });
  }

  private reloadProfileModes(): void {
    this.profileMode.getModes().subscribe({
      next: (modes) => {
        const sessionMode = this.auth.session()?.activeProfileMode;
        this.hasClientProfile.set(modes.hasClientProfile || sessionMode === 'Client');
        this.hasDeveloperProfile.set(
          modes.hasDeveloperProfile || sessionMode === 'Developer',
        );
      },
      error: () => {
        const sessionMode = this.auth.session()?.activeProfileMode;
        this.hasClientProfile.set(sessionMode === 'Client');
        this.hasDeveloperProfile.set(sessionMode === 'Developer');
      },
    });
  }

  protected onLogout(): void {
    this.closeAccountMenu();
    this.auth.logout();
    this.signalrService.stopHubConnection();
    this.chatSignalrService.stopHubConnection();
    void this.router.navigateByUrl('/auth/login');
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeMenus();
  }

  private closeMenus(): void {
    this.searchScopeOpen.set(false);
    this.accountMenuOpen.set(false);
    this.mobileNavOpen.set(false);
  }

  private getActiveLabelFromUrl(url: string): string {
    if (url.startsWith('/client/home')) return '';
    const match = this.navItems.find((item) => item.route && url.startsWith(item.route));
    return match?.label ?? '';
  }
}
