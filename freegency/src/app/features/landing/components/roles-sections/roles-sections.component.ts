import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap, registerGsapPlugins, ScrollTrigger } from '../../../../shared/animations/gsap';
import {
  createScrollExpandCardTimeline,
  prefersReducedMotion,
} from '../../../../shared/animations/scroll-expand-card';
import {
  createOrbitFloatAnimation,
  type OrbitFloatVariant,
} from '../../../../shared/animations/orbit-float';

const CARD_PERF_CLASSES =
  'will-change-[transform,opacity] [transform:translateZ(0)] motion-reduce:will-change-auto [&_[data-animate-item]]:will-change-[transform,opacity] [&_[data-animate-item]]:motion-reduce:will-change-auto';

@Component({
  selector: 'app-roles-sections',
  imports: [RouterLink],
  templateUrl: './roles-sections.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
})
export class RolesSectionsComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly roleCards = viewChildren<ElementRef<HTMLElement>>('roleCard');
  private readonly orbitFloatElements = viewChildren<ElementRef<HTMLElement>>('orbitFloat');

  protected readonly cardPerfClasses = CARD_PERF_CLASSES;

  protected readonly clientsAssetsBase = '/assets/landing/forclientsSection';

  protected readonly clientsCharacterImage =
    `${this.clientsAssetsBase}/ChatGPT Image Jul 18, 2026, 06_30_59 PM 1.png`;

  protected readonly clientsFeatures = [
    'Post projects in minutes',
    'Compare proposals and portfolios',
    'Secure payments with milestone escrow',
  ] as const;

  protected readonly teamsAssetsBase = '/assets/landing/WorkBetterTogether';

  protected readonly teamsCharacterImage =
    `${this.teamsAssetsBase}/ChatGPT Image Jul 18, 2026, 06_40_18 PM 1.png`;

  protected readonly teamsFeatures = [
    'Invite and manage teammates',
    'Assign tasks and track progress',
    'Deliver projects faster together',
  ] as const;

  protected readonly providersAssetsBase = '/assets/landing/BuildYourRepation';

  protected readonly providersCharacterImage =
    `${this.providersAssetsBase}/ChatGPT Image Jul 18, 2026, 06_40_22 PM 1.png`;

  protected readonly providersFeatures = [
    'Apply to software projects from vetted clients',
    'Build your public portfolio with verified reviews',
    'Get paid securely through escrow-based milestones',
  ] as const;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || prefersReducedMotion()) {
      return;
    }

    registerGsapPlugins();

    const gsapContext = gsap.context(() => {
      for (const cardRef of this.roleCards()) {
        createScrollExpandCardTimeline(cardRef.nativeElement);
      }

      for (const [index, floatRef] of this.orbitFloatElements().entries()) {
        const element = floatRef.nativeElement;
        const orbitCenter = element.closest<HTMLElement>('[data-orbit-center]');
        if (!orbitCenter) {
          continue;
        }

        const variant = (element.dataset['orbitFloat'] as OrbitFloatVariant | undefined) ?? 'badge';
        createOrbitFloatAnimation(element, orbitCenter, { index, variant });
      }
    }, this.host.nativeElement);

    ScrollTrigger.refresh();

    this.destroyRef.onDestroy(() => gsapContext.revert());
  }
}
