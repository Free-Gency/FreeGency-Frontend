import { gsap } from './gsap';

const MOBILE_MQ = '(max-width: 639px)';

/** Collapsed / expanded values — tweak trigger, scale, and timing here. */
const CONFIG = {
  scrollTrigger: {
    start: 'top 75%',
    toggleActions: 'play none none reverse',
  },
  card: {
    desktop: { scale: 0.85, y: 40 },
    mobile: { scale: 0.92, y: 24 },
    expand: { duration: 0.8, ease: 'power3.out' },
  },
  items: {
    desktop: { y: 12 },
    mobile: { y: 8 },
    reveal: { duration: 0.5, ease: 'power3.out', stagger: 0.1, overlap: '-=0.35' },
  },
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches;
}

/** One ScrollTrigger timeline per card — normal page scroll, no pin/scrub. */
export function createScrollExpandCardTimeline(card: HTMLElement): gsap.core.Timeline {
  const isMobile = isMobileViewport();
  const cardFrom = isMobile ? CONFIG.card.mobile : CONFIG.card.desktop;
  const itemFrom = isMobile ? CONFIG.items.mobile : CONFIG.items.desktop;
  const items = card.querySelectorAll<HTMLElement>('[data-animate-item]');

  gsap.set(card, {
    ...cardFrom,
    opacity: 0,
    transformOrigin: 'center top',
    force3D: true,
  });
  gsap.set(items, { opacity: 0, y: itemFrom.y });

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: card,
      start: CONFIG.scrollTrigger.start,
      toggleActions: CONFIG.scrollTrigger.toggleActions,
    },
  });

  timeline
    .to(card, {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: CONFIG.card.expand.duration,
      ease: CONFIG.card.expand.ease,
    })
    .to(
      items,
      {
        opacity: 1,
        y: 0,
        duration: CONFIG.items.reveal.duration,
        ease: CONFIG.items.reveal.ease,
        stagger: CONFIG.items.reveal.stagger,
      },
      CONFIG.items.reveal.overlap,
    );

  return timeline;
}
