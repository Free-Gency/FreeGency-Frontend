import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let pluginsRegistered = false;

/** Register GSAP plugins once for the whole app (safe to call repeatedly). */
export function registerGsapPlugins(): void {
  if (pluginsRegistered || typeof window === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  pluginsRegistered = true;
}

export { gsap, ScrollTrigger };
