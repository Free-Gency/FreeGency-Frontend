import { gsap } from './gsap';

export type OrbitFloatVariant = 'badge' | 'dot';

export interface OrbitFloatOptions {
  /** Arc displacement in px — badges ~10–14, dots ~6–9. */
  range?: number;
  /** Loop duration in seconds (3–5 for badges, 2.5–3.8 for dots). */
  duration?: number;
  /** Start offset in seconds. */
  delay?: number;
  variant?: OrbitFloatVariant;
  /** Used to derive unique duration/delay when not explicitly set. */
  index?: number;
}

const PRESETS: Record<
  OrbitFloatVariant,
  { range: number; durationBase: number; durationStep: number; delayStep: number }
> = {
  badge: { range: 12, durationBase: 1.8, durationStep: 0.25, delayStep: 0.15 },
  dot: { range: 8, durationBase: 1.4, durationStep: 0.15, delayStep: 0.1 },
};

/** Tangent unit vector for a short arc segment around `orbitCenter`. */
function getArcOffset(angle: number, range: number): { x: number; y: number } {
  return {
    x: -Math.sin(angle) * range,
    y: Math.cos(angle) * range,
  };
}

/**
 * Gentle back-and-forth float along a small arc of the orbit path.
 * Tweaks: range, duration, delay, or variant presets in PRESETS.
 */
export function createOrbitFloatAnimation(
  element: HTMLElement,
  orbitCenter: HTMLElement,
  options: OrbitFloatOptions = {},
): gsap.core.Tween {
  const variant =
    options.variant ?? (element.dataset['orbitFloat'] as OrbitFloatVariant | undefined) ?? 'badge';
  const preset = PRESETS[variant];
  const index = options.index ?? 0;

  const elementRect = element.getBoundingClientRect();
  const centerRect = orbitCenter.getBoundingClientRect();
  const elementX = elementRect.left + elementRect.width / 2;
  const elementY = elementRect.top + elementRect.height / 2;
  const centerX = centerRect.left + centerRect.width / 2;
  const centerY = centerRect.top + centerRect.height / 2;

  const angle = Math.atan2(elementY - centerY, elementX - centerX);
  const range = options.range ?? preset.range;
  const offset = getArcOffset(angle, range);
  const duration = options.duration ?? preset.durationBase + (index % 4) * preset.durationStep;
  const delay = options.delay ?? (index % 6) * preset.delayStep;

  gsap.set(element, { x: 0, y: 0, force3D: true });

  return gsap.fromTo(
    element,
    { x: -offset.x, y: -offset.y },
    {
      x: offset.x,
      y: offset.y,
      duration,
      delay,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    },
  );
}

/** Apply orbit float to every `[data-orbit-float]` element under `root`. */
export function initOrbitFloatAnimations(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-orbit-float]').forEach((element, index) => {
    const orbitCenter = element.closest<HTMLElement>('[data-orbit-center]');
    if (!orbitCenter) {
      return;
    }

    const variant = (element.dataset['orbitFloat'] as OrbitFloatVariant | undefined) ?? 'badge';
    createOrbitFloatAnimation(element, orbitCenter, { index, variant });
  });
}
