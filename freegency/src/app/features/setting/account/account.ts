import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowDown01Icon,
  Camera01Icon,
  Cancel01Icon,
  Location01Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons';
import { finalize, Observable } from 'rxjs';

import { SettingService } from '../Data-Access/setting-service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ClientAccount } from '../../../shared/models/client-account.model';
import { DeveloperProfile } from '../../freelancer/model/portfolio.model'; // adjust path
import { ProfileInterest } from '../../../shared/models/profile-interest';
import { Category } from '../../../shared/models/Category';

const BIO_MAX = 500;

/** Unified shape the form/template works with, regardless of mode. */
interface AccountFormProfile {
  firstName: string;
  lastName: string;
  email: string;
  country: string | null;
  bio: string | null;
  profileImage: string | null;
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HugeiconsIconComponent, DecimalPipe],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements OnInit {
  private settingService = inject(SettingService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  protected readonly cameraIcon = Camera01Icon as IconSvgObject;
  protected readonly locationIcon = Location01Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly cancelIcon = Cancel01Icon as IconSvgObject;
  protected readonly shieldIcon = SecurityCheckIcon as IconSvgObject;
  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly bioMax = BIO_MAX;

  /** Which mode we're editing for — drives which endpoints get called. */
  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  profile = signal<ClientAccount | DeveloperProfile | null>(null);
  readonly savingProfile = signal(false);
  readonly savingInterests = signal(false);
  interests = signal<ProfileInterest[]>([]);
  categories = signal<Category[]>([]);
  selectedImage: File | null = null;
  imageChanged = signal(false);
  interestsChanged = signal(false);
  readonly avatarUrl = signal<string | null>(null);
  readonly pendingCategoryId = signal('');
  readonly formDirty = signal(false);
  readonly formValid = signal(true);

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    country: [''],
    bio: ['', Validators.maxLength(BIO_MAX)],
  });

  readonly bioLength = signal(0);

  readonly availableCategories = computed(() => {
    const selected = new Set(this.interests().map((x) => x.id));
    return this.categories().filter((c) => !selected.has(c.id));
  });

  readonly saving = computed(() => this.savingProfile() || this.savingInterests());

  readonly canSave = computed(() => {
    const profileDirty = this.formValid() && (this.formDirty() || this.imageChanged());
    return profileDirty || this.interestsChanged();
  });

  ngOnInit(): void {
    this.form.controls.bio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.bioLength.set(value?.length ?? 0));

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFormState());

    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFormState());

    this.loadProfile();
    this.loadInterest();
    this.loadCategories();
  }

  private syncFormState(): void {
    this.formDirty.set(this.form.dirty);
    this.formValid.set(this.form.valid);
  }

  /** Normalizes either profile shape into what the form needs. */
  private toFormProfile(raw: ClientAccount | DeveloperProfile): AccountFormProfile {
    if (this.isDeveloper()) {
      const dev = raw as DeveloperProfile;
      return {
        firstName: dev.firstName,
        lastName: dev.lastName,
        email: this.auth.session()?.email ?? '',
        country: dev.country ?? '',
        bio: dev.bio ?? '',
        profileImage: dev.profileImage,
      };
    }
    const client = raw as ClientAccount;
    return {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      country: client.country ?? '',
      bio: client.bio ?? '',
      profileImage: client.profileImage,
    };
  }

  loadProfile(refreshImage = false): void {
    const request$: Observable<ClientAccount | DeveloperProfile> = this.isDeveloper()
      ? this.settingService.getDeveloperProfile()
      : this.settingService.getClientProfile();

    request$.subscribe({
      next: (raw: ClientAccount | DeveloperProfile) => {
        this.profile.set(raw);
        const profile = this.toFormProfile(raw);

        this.form.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          country: profile.country ?? '',
          bio: profile.bio ?? '',
        });
        this.bioLength.set(profile.bio?.length ?? 0);
        this.form.markAsPristine();
        this.syncFormState();

        const profileImage = refreshImage
          ? this.withCacheBust(profile.profileImage)
          : profile.profileImage;

        this.avatarUrl.set(profileImage ?? null);
        if (
          profileImage &&
          !profileImage.startsWith('data:') &&
          !profileImage.startsWith('blob:')
        ) {
          this.auth.setProfileImage(profileImage);
        } else if (!profileImage) {
          this.auth.setProfileImage(null);
        }
        this.auth.patchSessionNames(profile.firstName, profile.lastName);
        this.imageChanged.set(false);
      },
      error: (err: unknown) => {
        console.error(err);
        this.toast.error('Could not load your profile.');
      },
    });
  }

  loadInterest(): void {
    if (this.isDeveloper()) {
      this.interests.set([]);
      this.interestsChanged.set(false);
      return;
    }

    this.settingService.getClientInterests().subscribe({
      next: (res) => {
        this.interests.set(res);
        this.interestsChanged.set(false);
      },
    });
  }

  loadCategories(): void {
    this.settingService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data.items);
      },
    });
  }

  isSelected(id: string): boolean {
    return this.interests().some((x) => x.id === id);
  }

  removeInterest(id: string): void {
    this.interestsChanged.set(true);
    this.interests.update((list) => list.filter((i) => i.id !== id));
  }

  addPendingInterest(): void {
    const id = this.pendingCategoryId();
    if (!id) return;

    const category = this.categories().find((c) => c.id === id);
    if (!category || this.isSelected(id)) return;

    this.interestsChanged.set(true);
    this.interests.update((list) => [
      ...list,
      {
        id: category.id,
        name: category.name,
        nameEn: category.nameEn,
        imageCover: category.imageCover,
        specialties: [],
      },
    ]);
    this.pendingCategoryId.set('');
  }

  onPendingCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.pendingCategoryId.set(value);
  }

  saveAll(): void {
    if (this.saving()) return;

    this.syncFormState();
    const shouldSaveProfile = this.formValid() && (this.formDirty() || this.imageChanged());
    const shouldSaveInterests = this.interestsChanged();

    if (!shouldSaveProfile && !shouldSaveInterests) return;

    if (shouldSaveProfile) {
      this.saveProfile(shouldSaveInterests);
      return;
    }

    this.saveInterests();
  }

  saveInterests(): void {
    if (this.savingInterests()) return;

    const dto = {
      categoryIds: this.interests().map((x) => x.id),
    };

    const request$ = this.isDeveloper()
      ? this.settingService.replaceDeveloperInterests(dto)
      : this.settingService.replaceClientInterests(dto);

    this.savingInterests.set(true);
    request$.pipe(finalize(() => this.savingInterests.set(false))).subscribe({
      next: () => {
        this.interestsChanged.set(false);
        this.loadInterest();
        this.toast.success('Interests updated successfully.');
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Could not update interests. Please try again.');
      },
    });
  }

  resetAll(): void {
    this.resetForm();
    this.loadInterest();
    this.pendingCategoryId.set('');
  }

  saveProfile(alsoSaveInterests = false): void {
    if (this.form.invalid || this.savingProfile()) return;

    const formData = new FormData();
    formData.append('firstName', this.form.controls.firstName.value!);
    formData.append('lastName', this.form.controls.lastName.value!);
    formData.append('country', this.form.controls.country.value ?? '');
    formData.append('bio', this.form.controls.bio.value ?? '');

    if (this.selectedImage) {
      formData.append('profileImage', this.selectedImage);
    }

    const request$ = this.isDeveloper()
      ? this.settingService.updateDeveloperProfile(formData)
      : this.settingService.updateClientProfile(formData);

    this.savingProfile.set(true);
    request$.pipe(finalize(() => this.savingProfile.set(false))).subscribe({
      next: () => {
        const firstName = this.form.controls.firstName.value;
        const lastName = this.form.controls.lastName.value;
        this.auth.patchSessionNames(firstName, lastName);
        this.selectedImage = null;
        this.imageChanged.set(false);
        this.loadProfile(true);
        this.toast.success('Profile updated successfully.');

        if (alsoSaveInterests) {
          this.saveInterests();
        }
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Could not save your changes. Please try again.');
      },
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedImage = file;
    this.imageChanged.set(true);

    const reader = new FileReader();
    reader.onload = () => this.avatarUrl.set(reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void {
    this.avatarUrl.set(null);
    this.selectedImage = null;
    this.imageChanged.set(true);
  }

  resetForm(): void {
    const raw = this.profile();
    if (!raw) return;
    const profile = this.toFormProfile(raw);

    this.form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      country: profile.country ?? '',
      bio: profile.bio ?? '',
    });
    this.form.markAsPristine();
    this.syncFormState();
    this.avatarUrl.set(profile.profileImage ?? null);
    this.selectedImage = null;
    this.imageChanged.set(false);
  }

  private withCacheBust(url: string | null): string | null {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${Date.now()}`;
  }

  protected readonly profileEmail = computed(() => {
    const raw = this.profile();
    if (!raw) return '';
    return this.isDeveloper() ? (this.auth.session()?.email ?? '') : (raw as ClientAccount).email;
  });

  protected readonly profileVerified = computed(() => {
    const raw = this.profile();
    if (!raw || this.isDeveloper()) return false;
    return (raw as ClientAccount).isVerified;
  });

  protected readonly profileStatValue = computed(() => {
    const raw = this.profile();
    if (!raw) return 0;
    return this.isDeveloper()
      ? ((raw as DeveloperProfile).ratingCount ?? 0)
      : ((raw as ClientAccount).projectsPostedCount ?? 0);
  });

  protected readonly profileStatLabel = computed(() =>
    this.isDeveloper() ? 'reviews' : 'projects',
  );
}
