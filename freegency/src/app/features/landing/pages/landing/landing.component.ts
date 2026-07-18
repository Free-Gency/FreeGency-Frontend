import { NgStyle } from '@angular/common';
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
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';

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
  imports: [RouterLink, AuthAmbientBgComponent, NgStyle],
  templateUrl: './landing.component.html',
  styles: `
    @media (min-width: 1280px) {
      .hero-panel-left,
      .hero-panel-right {
        -webkit-mask-size: 100% 100%;
        mask-size: 100% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        mask-mode: alpha;
      }

      .hero-panel-left {
        -webkit-mask-image: url('/assets/landing/hero/subtract-left.svg');
        mask-image: url('/assets/landing/hero/subtract-left.svg');
      }

      .hero-panel-right {
        -webkit-mask-image: url('/assets/landing/hero/subtract-right.svg');
        mask-image: url('/assets/landing/hero/subtract-right.svg');
      }
    }

    .headline-category-img {
      transition: opacity 350ms ease;
    }

    .headline-category-img.is-fading {
      opacity: 0;
    }
  `,
})
export class LandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private fadeTimeoutId: number | undefined;

  protected readonly navLinks = [
    { label: 'Home', active: true, hasChevron: false },
    { label: 'Explore Services', active: false, hasChevron: true },
    { label: 'About Us', active: false, hasChevron: false },
    { label: 'Contact', active: false, hasChevron: false },
    { label: 'FAQ', active: false, hasChevron: false },
  ] as const;

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

  /** Equal 36px gaps. SVG 640: r 247.5 / 283.5 / 319.5 */
  private readonly rings = { inner: 38.67, mid: 44.3, outer: 49.92 } as const;

  /** Utility icons on first ellipse; avatars on mid/outer (move with rings) */
  protected readonly orbitSizes = {
    call: 11,
    zoom: 8.2,
    videoW: 9.2,
    videoH: 8.1,
    illustrator: 6.5,
    trello: 8.5,
    avatarCoder: 10.52,
    avatarArtist: 15.03,
    avatarGroup: 9.97,
    avatarMegaphone: 16.5,
    avatarHeadset: 18.5,
  } as const;

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

  /**
   * Place item on a ring. angleDeg: 0 = top, clockwise.
   * Sizes from Figma inspect (px / 599).
   */
  protected orbitStyle(angleDeg: number, ring: keyof typeof this.rings, wPct: number, hPct = wPct) {
    const r = this.rings[ring];
    const rad = (angleDeg * Math.PI) / 180;
    return {
      left: `${50 + r * Math.sin(rad) - wPct / 2}%`,
      top: `${50 - r * Math.cos(rad) - hPct / 2}%`,
      width: `${wPct}%`,
      height: `${hPct}%`,
    };
  }
}
