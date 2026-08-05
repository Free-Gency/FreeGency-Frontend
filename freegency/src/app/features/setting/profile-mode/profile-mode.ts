import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Briefcase01Icon,
  CheckmarkCircle02Icon,
  UserAccountIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../core/auth/auth.service';
import type { UserMode } from '../../../core/auth/auth.models';
import { ProfileApiService } from '../../auth/data-access/profile-api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  PROFILE_MISSING_ERROR,
  ProfileModeService,
} from '../../../shared/services/profile-mode.service';
import { extractApiError } from '../../../core/http/api-error';

type OtherProfileSummary = {
  displayName: string;
  bio: string | null;
  country: string | null;
  image: string | null;
};

@Component({
  selector: 'app-profile-mode',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './profile-mode.html',
  styleUrl: './profile-mode.css',
})
export class ProfileModePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly profileModeApi = inject(ProfileModeService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly toast = inject(ToastService);

  protected readonly clientIcon = UserAccountIcon as IconSvgObject;
  protected readonly developerIcon = Briefcase01Icon as IconSvgObject;
  protected readonly checkIcon = CheckmarkCircle02Icon as IconSvgObject;

  protected readonly modesLoaded = signal(false);
  protected readonly loadingModes = signal(true);
  protected readonly modesError = signal<string | null>(null);
  protected readonly hasClientProfile = signal(false);
  protected readonly hasDeveloperProfile = signal(false);
  protected readonly switchingMode = signal(false);
  protected readonly otherProfile = signal<OtherProfileSummary | null>(null);
  protected readonly loadingOtherProfile = signal(false);

  protected readonly activeMode = computed(
    () => this.auth.session()?.activeProfileMode ?? 'Client',
  );

  protected readonly busy = computed(() => this.switchingMode());

  protected readonly otherMode = computed<UserMode>(() =>
    this.activeMode() === 'Client' ? 'Developer' : 'Client',
  );

  protected readonly hasOtherProfile = computed(() =>
    this.activeMode() === 'Client'
      ? this.hasDeveloperProfile()
      : this.hasClientProfile(),
  );

  protected readonly activeDisplayName = computed(() => {
    const session = this.auth.session();
    const full = [session?.firstName, session?.lastName]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(' ');
    return full || 'Your account';
  });

  protected readonly activeEmail = computed(() => this.auth.session()?.email ?? '');

  ngOnInit(): void {
    this.reloadModes();
  }

  /** Switch when the other profile already exists. */
  protected switchToOther(): void {
    const mode = this.otherMode();
    if (!this.hasOtherProfile() || this.busy()) return;

    this.switchingMode.set(true);
    this.profileModeApi.switchToMode(mode).subscribe({
      next: () => {
        this.switchingMode.set(false);
        this.toast.success(`Switched to ${mode} mode.`);
      },
      error: (err) => {
        this.switchingMode.set(false);
        if (err instanceof Error && err.message === PROFILE_MISSING_ERROR) return;
        this.toast.error(extractApiError(err, `Could not switch to ${mode}.`));
      },
    });
  }

  /** Create the missing profile and open its onboarding. */
  protected createOtherProfile(): void {
    const mode = this.otherMode();
    if (this.hasOtherProfile() || this.busy()) return;

    this.switchingMode.set(true);
    this.profileModeApi.createAndSwitchToMode(mode).subscribe({
      next: () => {
        this.switchingMode.set(false);
        if (mode === 'Developer') this.hasDeveloperProfile.set(true);
        else this.hasClientProfile.set(true);

        this.toast.success(
          mode === 'Developer'
            ? 'Developer profile created — finish your setup.'
            : 'Client profile created — finish your setup.',
        );
      },
      error: (err) => {
        this.switchingMode.set(false);
        this.toast.error(extractApiError(err, `Could not create ${mode} profile.`));
      },
    });
  }

  protected reloadModes(): void {
    this.loadingModes.set(true);
    this.modesError.set(null);
    this.profileModeApi.getModes().subscribe({
      next: (modes) => {
        const sessionMode = this.auth.session()?.activeProfileMode;
        this.hasClientProfile.set(
          modes.hasClientProfile || sessionMode === 'Client',
        );
        this.hasDeveloperProfile.set(
          modes.hasDeveloperProfile || sessionMode === 'Developer',
        );
        this.modesLoaded.set(true);
        this.loadingModes.set(false);
        this.loadOtherProfileDetails();
      },
      error: (err) => {
        const sessionMode = this.auth.session()?.activeProfileMode;
        if (sessionMode === 'Client' || sessionMode === 'Developer') {
          this.hasClientProfile.set(sessionMode === 'Client');
          this.hasDeveloperProfile.set(sessionMode === 'Developer');
          this.modesLoaded.set(true);
          this.loadingModes.set(false);
          this.modesError.set(
            extractApiError(err, 'Couldn’t refresh profile status from the server.'),
          );
          this.loadOtherProfileDetails();
          return;
        }
        this.modesLoaded.set(false);
        this.loadingModes.set(false);
        this.modesError.set(
          extractApiError(err, 'Couldn’t load profile status. Refresh and try again.'),
        );
      },
    });
  }

  private loadOtherProfileDetails(): void {
    if (!this.hasOtherProfile()) {
      this.otherProfile.set(null);
      return;
    }

    this.loadingOtherProfile.set(true);
    const mode = this.otherMode();

    if (mode === 'Developer') {
      this.profileApi.getDeveloperProfile().subscribe({
        next: (profile) => this.applyOtherProfile(mode, profile),
        error: () => this.applyOtherProfileFallback(mode),
      });
      return;
    }

    this.profileApi.getClientProfile().subscribe({
      next: (profile) => this.applyOtherProfile(mode, profile),
      error: () => this.applyOtherProfileFallback(mode),
    });
  }

  private applyOtherProfile(
    mode: UserMode,
    profile: { firstName: string; lastName: string; bio: string | null; country?: string | null; profileImage: string | null },
  ): void {
    const name = [profile.firstName, profile.lastName]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(' ');
    this.otherProfile.set({
      displayName: name || `${mode} profile`,
      bio: profile.bio ?? null,
      country: profile.country ?? null,
      image: profile.profileImage ?? null,
    });
    this.loadingOtherProfile.set(false);
  }

  private applyOtherProfileFallback(mode: UserMode): void {
    this.otherProfile.set({
      displayName: `${mode} profile`,
      bio: null,
      country: null,
      image: null,
    });
    this.loadingOtherProfile.set(false);
  }
}
