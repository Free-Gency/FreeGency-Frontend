import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthAmbientBgComponent } from '../../../auth/components/auth-ambient-bg/auth-ambient-bg.component';
import { BrandComponent } from '../../components/brand/brand.component';
import { RolesIntroComponent } from '../../components/roles-intro/roles-intro.component';
import { RolesSectionsComponent } from '../../components/roles-sections/roles-sections.component';

const CATEGORY_IMAGES = [
  '01.png',
  '02.png',
  '03.png',
  '04.png',
  '05.png',
  '06.png',
] as const;

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    AuthAmbientBgComponent,
    BrandComponent,
    RolesIntroComponent,
    RolesSectionsComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private fadeTimeoutId: number | undefined;

  protected readonly navLinks = [
    { label: 'Home', hasChevron: false },
    { label: 'Explore Services', hasChevron: true },
    { label: 'About Us', hasChevron: false },
    { label: 'Contact', hasChevron: false },
    { label: 'FAQ', hasChevron: false },
  ] as const;

  protected readonly activeNav = signal<string>('Home');

  protected readonly trustAvatars = [
    'user-1.png',
    'user-2.png',
    'user-3.png',
    'user-4.png',
    'user-5.png',
  ] as const;

  protected readonly serviceCategories = [
    'UI/UX Design',
    'Development',
    'Motion Graphics',
    'Graphic Design',
    'AI Services',
    'Finance Tech',
    'Product Strategy',
    'QA',
  ] as const;

  private readonly categoryImageIndex = signal(0);
  protected readonly categoryImageFading = signal(false);
  protected readonly categoryImageSrc = computed(() => {
    const file = CATEGORY_IMAGES[this.categoryImageIndex()];
    return `/assets/landing/categories/${file}`;
  });

  protected readonly mobileNavOpen = signal(false);
  protected servicesOpen = false;
  protected selectedCategory: string | null = null;

  ngOnInit(): void {
    for (const file of CATEGORY_IMAGES) {
      const img = new Image();
      img.src = `/assets/landing/categories/${file}`;
    }

    const intervalId = window.setInterval(() => this.advanceCategoryImage(), 2800);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(intervalId);
      if (this.fadeTimeoutId !== undefined) {
        window.clearTimeout(this.fadeTimeoutId);
      }
    });
  }

  private advanceCategoryImage(): void {
    this.categoryImageFading.set(true);
    if (this.fadeTimeoutId !== undefined) {
      window.clearTimeout(this.fadeTimeoutId);
    }
    this.fadeTimeoutId = window.setTimeout(() => {
      this.categoryImageIndex.update((i) => (i + 1) % CATEGORY_IMAGES.length);
      this.categoryImageFading.set(false);
      this.fadeTimeoutId = undefined;
    }, 350);
  }

  protected selectNav(label: string, event: Event): void {
    event.preventDefault();
    this.activeNav.set(label);
    this.mobileNavOpen.set(false);
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
    this.servicesOpen = false;
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected toggleServices(event: Event): void {
    event.stopPropagation();
    this.servicesOpen = !this.servicesOpen;
  }

  protected selectCategory(category: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory = category;
    this.servicesOpen = false;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-services-dropdown]')) {
      this.servicesOpen = false;
    }
    if (!target.closest('[data-mobile-nav]')) {
      this.mobileNavOpen.set(false);
    }
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth >= 1280) {
      this.mobileNavOpen.set(false);
    }
  }
}
