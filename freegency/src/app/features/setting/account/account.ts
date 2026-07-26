import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';

import { SettingService } from '../Data-Access/setting-service';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ClientAccount } from '../../../shared/models/client-account.model';
import { ProfileInterest } from '../../../shared/models/profile-interest';
import { Category } from '../../../shared/models/Category';

type AccountTab = 'profile' | 'interests';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements OnInit {

  private settingService = inject(SettingService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  profile = signal<ClientAccount | null>(null);
  readonly savingProfile = signal(false);
  readonly savingInterests = signal(false);

  interests = signal<ProfileInterest[]>([]);

  categories = signal<Category[]>([]);

  readonly activeTab = signal<AccountTab>('profile');

  private interestsLoaded = false;

  selectedImage: File | null = null;
  imageChanged = signal(false);

interestsChanged = signal(false);
  readonly form = this.fb.group({

    firstName: ['', Validators.required],

    lastName: ['', Validators.required],

    email: [{ value: '', disabled: true }],

    country: [''],

    bio: ['']

  });

  ngOnInit(): void {

    this.loadProfile();

  }

 loadProfile(refreshImage = false) {

  this.settingService.getClientProfile().subscribe({

    next: profile => {

      this.profile.set(profile);

      this.form.patchValue({

        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        country: profile.country ?? '',
        bio: profile.bio ?? ''

      });

      this.form.markAsPristine();

      const profileImage = refreshImage
        ? this.withCacheBust(profile.profileImage)
        : profile.profileImage;

      this.avatarUrl.set(profileImage ?? null);
      if (profileImage && !profileImage.startsWith('data:') && !profileImage.startsWith('blob:')) {
        this.auth.setProfileImage(profileImage);
      } else if (!profileImage) {
        this.auth.setProfileImage(null);
      }
      this.auth.patchSessionNames(profile.firstName, profile.lastName);

      this.imageChanged.set(false);

    }

  });

}

  loadInterest() {

    this.settingService.getClientInterests().subscribe({

      next: (res) =>{ this.interests.set(res)
      this.interestsChanged.set(false);
      }
    });

  }

  loadCategories() {

    this.settingService.getCategories().subscribe({

      next: res => {

        this.categories.set(res.data.items);

      }

    });

  }

  setTab(tab: AccountTab) {

    this.activeTab.set(tab);

    if (tab === 'interests' && !this.interestsLoaded) {

      this.interestsLoaded = true;

      this.loadInterest();

      this.loadCategories();

    }

  }

  isSelected(id: string) {

    return this.interests().some(x => x.id === id);

  }

  toggleInterest(category: Category) {
    this.interestsChanged.set(true);

    if (this.isSelected(category.id)) {

      this.interests.update(x =>

        x.filter(i => i.id !== category.id)

      );

      return;

    }

    this.interests.update(x => [

      ...x,

      {

        id: category.id,

        name: category.name,

        nameEn: category.nameEn,

        imageCover: category.imageCover,

        specialties: []

      }

    ]);

  }

  saveInterests() {
    if (this.savingInterests())
      return;

    const dto = {
  categoryIds: this.interests().map(x => x.id)
};

    this.savingInterests.set(true);

    this.settingService.replaceClientInterests(dto)
      .pipe(finalize(() => this.savingInterests.set(false)))
      .subscribe({

    next: () => {

      this.interestsChanged.set(false);

      this.loadInterest();
      this.toast.success('Interests updated successfully.');

    },

    error: err => {
      console.error(err);
      this.toast.error('Could not update interests. Please try again.');
    }

  });

  }
  resetInterests() {

  this.loadInterest();

  this.interestsChanged.set(false);

}
 saveProfile() {

  if (this.form.invalid || this.savingProfile())
    return;

  const formData = new FormData();

  formData.append(
    'firstName',
    this.form.controls.firstName.value!
  );

  formData.append(
    'lastName',
    this.form.controls.lastName.value!
  );

  formData.append(
    'country',
    this.form.controls.country.value ?? ''
  );

  formData.append(
    'bio',
    this.form.controls.bio.value ?? ''
  );

  if (this.selectedImage) {

    formData.append(
      'profileImage',
      this.selectedImage
    );

  }

  this.savingProfile.set(true);

  this.settingService.updateClientProfile(formData)
    .pipe(finalize(() => this.savingProfile.set(false)))
    .subscribe({

    next: () => {
      const firstName = this.form.controls.firstName.value;
      const lastName = this.form.controls.lastName.value;

      this.auth.patchSessionNames(firstName, lastName);

      this.selectedImage = null;

      this.imageChanged.set(false);

      this.loadProfile(true);
      this.toast.success('Profile updated successfully.');

    },

    error: err => {

      console.error(err);
      this.toast.error('Could not save your changes. Please try again.');

    }

  });

}

  readonly avatarUrl = signal<string | null>(null);

 onPhotoSelected(event: Event) {

  const input = event.target as HTMLInputElement;

  const file = input.files?.[0];

  if (!file)
    return;

  this.selectedImage = file;

  this.imageChanged.set(true);

  const reader = new FileReader();

  reader.onload = () =>
    this.avatarUrl.set(reader.result as string);

  reader.readAsDataURL(file);

}

  removePhoto() {

  this.avatarUrl.set(null);

  this.selectedImage = null;

  this.imageChanged.set(true);

}
  resetForm(): void {

  const profile = this.profile();

  if (!profile)
    return;

  this.form.reset({

    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    country: profile.country ?? '',
    bio: profile.bio ?? ''

  });

  this.form.markAsPristine();

  this.avatarUrl.set(profile.profileImage ?? null);

  this.selectedImage = null;

  this.imageChanged.set(false);

}

  private withCacheBust(url: string | null): string | null {
    if (!url || url.startsWith('data:') || url.startsWith('blob:'))
      return url;

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${Date.now()}`;
  }
}