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
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CLIENT_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import {
  type ClientAccountResponse,
  ProfileApiService,
} from '../../data-access/profile-api.service';

const MAX_BIO = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-client-onboarding-profile',
  imports: [FormsModule, HugeiconsIconComponent],
  templateUrl: './client-onboarding-profile.component.html',
})
export class ClientOnboardingProfileComponent implements OnInit, OnDestroy {
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly profileApi = inject(ProfileApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected displayName = '';
  protected bio = '';
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingProfile = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly cameraIcon = Camera01Icon as IconSvgObject;
  protected readonly editIcon = PencilEdit01Icon as IconSvgObject;
  protected readonly bioLimit = MAX_BIO;

  protected get bioCount(): number {
    return this.bio.length;
  }

  private selectedFile: File | null = null;
  private existingCountry: string | null = null;
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
      this.errorMessage.set('Please log in to continue onboarding.');
      await this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: CLIENT_ONBOARDING_PATH },
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
        this.profileApi.updateClientProfile({
          firstName,
          lastName,
          country: this.existingCountry,
          bio: this.bio.trim() || null,
          profileImage: this.selectedFile,
        }),
      );
      this.auth.patchSessionNames(firstName, lastName);
      await this.router.navigate([`${CLIENT_ONBOARDING_PATH}/interests`]);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err));
    }
  }

  protected onSkip(): void {
    if (this.loading()) return;
    void this.router.navigate([`${CLIENT_ONBOARDING_PATH}/interests`]);
  }

  private hydrateFromSession(): void {
    const session = this.auth.session();
    if (session?.firstName || session?.lastName) {
      this.displayName = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();
    }
  }

  private loadProfile(): void {
    this.loadingProfile.set(true);

    this.profileApi.getClientProfile().subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.loadingProfile.set(false);
      },
      error: (err) => {
        this.loadingProfile.set(false);
        // Keep the form usable — session name is already shown.
        this.errorMessage.set(
          extractApiError(err, 'Could not load your saved profile. You can still continue.'),
        );
      },
    });
  }

  private applyProfile(profile: ClientAccountResponse): void {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    if (name) this.displayName = name;

    this.bio = (profile.bio ?? '').slice(0, MAX_BIO);
    this.existingCountry = profile.country;

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
