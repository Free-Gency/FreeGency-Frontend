import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowDown01Icon,
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
import { SignalrService } from '../../../core/Signalr/signalr-service';

export type DeveloperSearchScope = 'Projects' | 'Talents';

@Component({
  selector: 'app-developer-view-navbar',
  imports: [HugeiconsIconComponent, RouterLink],
  templateUrl: './developer-view-navbar.component.html',
})
export class DeveloperViewNavbarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly signalrService = inject(SignalrService);

  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly notificationIcon = Notification02Icon as IconSvgObject;
  protected readonly checkIcon = Tick02Icon as IconSvgObject;
  protected readonly settingsIcon = Settings01Icon as IconSvgObject;
  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly helpIcon = HelpCircleIcon as IconSvgObject;
  protected readonly logoutIcon = Logout01Icon as IconSvgObject;
  protected readonly profileImage = this.auth.profileImage;

  protected readonly navItems = [
    { label: 'Home', route: '/developer/dashboard' },
    { label: 'Explore', route: '/developer/explore' },
    { label: 'Manage Work', route: '/developer/manage-work' },
    { label: 'Teams', route: '/developer/teams' },
    { label: 'Jobs', route: '/developer/jobs' },
    { label: 'Messages', route: '/developer/messages' },
  ] as const;

  protected readonly activeNav = signal(this.getActiveLabelFromUrl(this.router.url));
  protected readonly searchScope = signal<DeveloperSearchScope>('Projects');
  protected readonly searchScopeOpen = signal(false);
  protected readonly accountMenuOpen = signal(false);

  protected readonly searchScopes: readonly DeveloperSearchScope[] = ['Projects', 'Talents'];
  protected readonly profileModes: readonly UserMode[] = ['Developer', 'Client'];

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
    () => this.auth.session()?.activeProfileMode ?? 'Developer',
  );

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.activeNav.set(this.getActiveLabelFromUrl(event.urlAfterRedirects));
      });
  }

  protected searchPlaceholder(): string {
    return this.searchScope() === 'Projects' ? 'Search projects' : 'Search talents';
  }

  protected selectNav(item: (typeof this.navItems)[number]): void {
    this.closeMenus();
    if (item.route) {
      void this.router.navigate([item.route]);
    }
  }

  protected toggleSearchScope(event: MouseEvent): void {
    event.stopPropagation();
    this.accountMenuOpen.set(false);
    this.searchScopeOpen.update((open) => !open);
  }

  protected selectSearchScope(scope: DeveloperSearchScope, event: MouseEvent): void {
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

  protected onLogout(): void {
    this.closeAccountMenu();
    this.auth.logout();
    this.signalrService.stopHubConnection();
    void this.router.navigateByUrl('/auth/login');
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeMenus();
  }

  private closeMenus(): void {
    this.searchScopeOpen.set(false);
    this.accountMenuOpen.set(false);
  }

  private getActiveLabelFromUrl(url: string): string {
    const match = this.navItems.find((item) => item.route && url.startsWith(item.route));
    return match?.label ?? 'Home';
  }
}
