import {
  Component,
  OnDestroy,
  OnInit,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Camera01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import allCountries from 'intl-tel-input/data';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEVELOPER_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import {
  type DeveloperAccountResponse,
  ProfileApiService,
} from '../../data-access/profile-api.service';

const MAX_BIO = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

@Component({
  selector: 'app-developer-onboarding-profile',
  imports: [FormsModule, HugeiconsIconComponent],
  templateUrl: './developer-onboarding-profile.component.html',
})
export class DeveloperOnboardingProfileComponent implements OnInit, OnDestroy {
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly profileApi = inject(ProfileApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected displayName = '';
  protected bio = '';
  protected country = '';
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingProfile = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly cameraIcon = Camera01Icon as IconSvgObject;
  protected readonly editIcon = PencilEdit01Icon as IconSvgObject;
  protected readonly bioLimit = MAX_BIO;

  protected readonly countries = allCountries
    .map((c) => {
      const code = c.iso2.toUpperCase();
      return {
        code,
        name: countryDisplayNames.of(code) ?? code,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  protected get bioCount(): number {
    return this.bio.length;
  }

  private selectedFile: File | null = null;
  private objectUrl: string | null = null;

  ngOnInit(): void {
    this.hydrateFromSession();
    if (!this.auth.isLoggedIn()) return;
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.uploadError.set(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.uploadError.set('Please upload a JPEG, PNG, or WebP image.');
      input.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      this.uploadError.set('Image must be 5MB or smaller.');
      input.value = '';
      return;
    }

    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

    this.selectedFile = file;
    this.objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.objectUrl);
  }

  protected onBioInput(value: string): void {
    this.bio = value.slice(0, MAX_BIO);
  }

  protected async onContinue(): Promise<void> {
    this.errorMessage.set(null);
    this.uploadError.set(null);
    if (this.loading()) return;

    if (!this.auth.isLoggedIn()) {
      this.errorMessage.set('Please log in to continue setup.');
      await this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: DEVELOPER_ONBOARDING_PATH },
      });
      return;
    }

    const { firstName, lastName } = splitDisplayName(this.displayName);
    if (!firstName || !lastName) {
      this.errorMessage.set('Display name is required.');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(
        this.profileApi.updateDeveloperProfile({
          firstName,
          lastName,
          country: this.country.trim() || null,
          bio: this.bio.trim() || null,
          profileImage: this.selectedFile,
        }),
      );
      this.auth.patchSessionNames(firstName, lastName);
      if (this.previewUrl()) {
        this.auth.setProfileImage(this.previewUrl());
      }
      await this.markOnboardingStarted();
      await this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/expertise`]);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err));
    }
  }

  protected async onSkip(): Promise<void> {
    if (this.loading()) return;
    await this.markOnboardingStarted();
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/expertise`]);
  }

  private async markOnboardingStarted(): Promise<void> {
    if (this.auth.session()?.hasCompletedOnboarding) return;

    try {
      await firstValueFrom(this.profileApi.completeOnboarding());
      this.auth.markOnboardingComplete();
    } catch {
      // Non-blocking
    }
  }

  private hydrateFromSession(): void {
    const session = this.auth.session();
    if (session?.firstName || session?.lastName) {
      this.displayName = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();
    }
  }

  private loadProfile(): void {
    this.loadingProfile.set(true);

    this.profileApi.getDeveloperProfile().subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.loadingProfile.set(false);
      },
      error: (err) => {
        this.loadingProfile.set(false);
        this.errorMessage.set(
          extractApiError(err, 'Could not load your developer profile. You can still continue.'),
        );
      },
    });
  }

  private applyProfile(profile: DeveloperAccountResponse): void {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    if (name) this.displayName = name;

    this.bio = (profile.bio ?? '').slice(0, MAX_BIO);
    this.country = profile.country?.trim() || '';

    if (profile.profileImage && !this.selectedFile) {
      this.previewUrl.set(profile.profileImage);
    }

    this.auth.patchSessionNames(profile.firstName, profile.lastName);
  }
}

function splitDisplayName(value: string): { firstName: string; lastName: string } {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };

  const space = trimmed.indexOf(' ');
  if (space === -1) {
    const name = trimmed.slice(0, 50);
    return { firstName: name, lastName: name };
  }

  return {
    firstName: trimmed.slice(0, space).slice(0, 50),
    lastName: trimmed.slice(space + 1).slice(0, 50),
  };
}
