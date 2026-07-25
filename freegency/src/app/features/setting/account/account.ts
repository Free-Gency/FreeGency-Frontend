  import { Component, inject, OnInit, signal } from '@angular/core';
  import { SettingService } from '../Data-Access/setting-service';
  import { ClientAccount } from '../../../shared/models/client-account.model';
  import { Category } from '../../../shared/models/Category';
import { ProfileInterest } from '../../../shared/models/profile-interest';
  type AccountTab = 'profile' | 'interests';

  @Component({
    selector: 'app-account',
    imports: [],
    templateUrl: './account.html',
    styleUrl: './account.css',
  })
  export class Account implements OnInit {

    private settingService = inject(SettingService);

    profile = signal<ClientAccount | null>(null);
    interests = signal<ProfileInterest[]>([]);
    categories = signal<Category[]>([]);
    ngOnInit(): void {
      this.loadProfile();
    }

    loadProfile(): void {
      this.settingService.getClientProfile().subscribe({
        next: (res) => {
          this.profile.set(res);
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
    loadInterest():void{
      this.settingService.getClientInterests().subscribe({
        next:(res)=>{
          this.interests.set(res);
        },
        error: (err) => {
          console.error(err);
        }
      })
    }
    loadCategories() {
    this.settingService.getCategories().subscribe({
      next: (res) => {
         this.categories.set(res.data.items);     
      }
    });
  }
    readonly activeTab = signal<AccountTab>('profile');
  
  private interestsLoaded = false;

  setTab(tab: AccountTab): void {

    this.activeTab.set(tab);

    if (tab === 'interests' && !this.interestsLoaded) {

      this.interestsLoaded = true;

      this.loadInterest();

      this.loadCategories();

    }

  }
  isSelected(id: string): boolean {
    return this.interests().some(x => x.id === id);
  }
  toggleInterest(category: Category): void {

    if (this.isSelected(category.id)) {

      this.interests.update(interests =>
        interests.filter(x => x.id !== category.id)
      );

      return;
    }

    this.interests.update(interests => [
      ...interests,
      {
        id: category.id,
        name: category.name,
        nameEn: category.nameEn,
        imageCover: category.imageCover,
        specialties: []
      }
    ]);

  }
  saveInterests(): void {

    const dto = {

      interestIds: this.interests().map(x => x.id)

    };

    console.log(dto);

    // this.settingService.replaceClientInterests(dto).subscribe();

  }
    /* ---------- Photo upload (real preview, static everything else) ---------- */
    readonly avatarUrl = signal<string | null>(null);
  
    onPhotoSelected(event: Event): void {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = () => this.avatarUrl.set(reader.result as string);
      reader.readAsDataURL(file);
  
      // reset so selecting the same file twice still fires 'change'
      input.value = '';
    }
  
    removePhoto(): void {
      this.avatarUrl.set(null);
    }
  }
