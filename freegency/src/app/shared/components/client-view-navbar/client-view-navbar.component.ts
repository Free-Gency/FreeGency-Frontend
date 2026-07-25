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
import { Router, RouterLink } from '@angular/router';
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
import { ProfileApiService } from '../../../features/auth/data-access/profile-api.service';

export type ClientSearchScope = 'Projects' | 'Talents';

@Component({
  selector: 'app-client-view-navbar',
  imports: [HugeiconsIconComponent, RouterLink],
  templateUrl: './client-view-navbar.component.html',
})
export class ClientViewNavbarComponent implements OnInit {
  private readonly profileApi = inject(ProfileApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly notificationIcon = Notification02Icon as IconSvgObject;
  protected readonly checkIcon = Tick02Icon as IconSvgObject;
  protected readonly settingsIcon = Settings01Icon as IconSvgObject;
  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly helpIcon = HelpCircleIcon as IconSvgObject;
  protected readonly logoutIcon = Logout01Icon as IconSvgObject;

  protected readonly defaultAvatar = '/assets/CreateProject/avatar.jpg';
  protected readonly profileImage = signal<string | null>(null);
  protected readonly activeNav = signal('Hire Talent');
  protected readonly searchScope = signal<ClientSearchScope>('Projects');
  protected readonly searchScopeOpen = signal(false);
  protected readonly accountMenuOpen = signal(false);

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

  protected readonly email = computed(() => this.auth.session()?.email ?? '');
  protected readonly activeMode = computed(
    () => this.auth.session()?.activeProfileMode ?? 'Client',
  );

  protected readonly navItems = [
    { label: 'Hire Talent', dropdown: true },
    { label: 'Manage Work', dropdown: false },
    { label: 'Reports', dropdown: true },
    { label: 'Messages', dropdown: false },
  ] as const;

  ngOnInit(): void {
    this.profileApi
      .getClientProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profileImage.set(profile.profileImage);
          this.auth.patchSessionNames(profile.firstName, profile.lastName);
        },
        error: () => this.profileImage.set(null),
      });
  }

  protected avatarSrc(): string {
    return this.profileImage() || this.defaultAvatar;
  }

  protected searchPlaceholder(): string {
    return this.searchScope() === 'Projects' ? 'Search projects' : 'Search talents';
  }

  protected selectNav(label: string): void {
    this.activeNav.set(label);
    this.closeMenus();
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

  protected onLogout(): void {
    this.closeAccountMenu();
    this.auth.logout();
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
}
