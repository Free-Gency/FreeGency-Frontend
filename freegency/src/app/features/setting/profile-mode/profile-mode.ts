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
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ProfileModeService } from '../../../shared/services/profile-mode.service';
import { extractApiError } from '../../../core/http/api-error';

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

  protected readonly activeMode = computed(
    () => this.auth.session()?.activeProfileMode ?? 'Client',
  );

  protected readonly busy = computed(() => this.switchingMode());

  protected readonly hasOtherProfile = computed(() =>
    this.activeMode() === 'Client'
      ? this.hasDeveloperProfile()
      : this.hasClientProfile(),
  );

  ngOnInit(): void {
    this.reloadModes();
  }

  /**
   * Always show Switch under the other profile card.
   * Creates the profile first when it doesn’t exist yet (then setup / home).
   */
  protected switchOrCreate(mode: UserMode): void {
    if (mode === this.activeMode() || this.busy()) return;

    const hasTarget =
      mode === 'Developer' ? this.hasDeveloperProfile() : this.hasClientProfile();

    this.switchingMode.set(true);
    this.profileModeApi
      .switchToMode(mode, { confirmCreate: () => true })
      .subscribe({
        next: () => {
          this.switchingMode.set(false);
          if (mode === 'Developer') this.hasDeveloperProfile.set(true);
          else this.hasClientProfile.set(true);

          if (!hasTarget && mode === 'Developer') {
            this.toast.success('Developer profile ready — finish your setup.');
          } else if (!hasTarget) {
            this.toast.success(`${mode} profile ready — switched.`);
          } else {
            this.toast.success(`Switched to ${mode} mode.`);
          }
        },
        error: (err) => {
          this.switchingMode.set(false);
          if (err instanceof Error && err.message === 'cancelled') return;
          this.toast.error(extractApiError(err, `Could not switch to ${mode}.`));
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
}
