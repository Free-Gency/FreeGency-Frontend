import { Component } from '@angular/core';

type BrandLogo = {
  src: string;
  alt: string;
  label?: string;
  width: number;
  height: number;
};

@Component({
  selector: 'app-brand',
  templateUrl: './brand.component.html',
  host: {
    class: 'block w-full',
  },
})
export class BrandComponent {
  protected readonly logos: readonly BrandLogo[] = [
    { src: 'google.svg', alt: 'Google', label: 'Google', width: 36, height: 36 },
    { src: 'trello.svg', alt: 'Trello', label: 'Trello', width: 36, height: 36 },
    { src: 'paypal.svg', alt: 'PayPal', label: 'PayPal', width: 36, height: 36 },
    { src: 'linkedin.svg', alt: 'LinkedIn', label: 'LinkedIn', width: 36, height: 36 },
    { src: 'ai.svg', alt: 'AI', label: 'AI', width: 36, height: 36 },
    { src: 'stripe.svg', alt: 'Stripe', width: 123, height: 42 },
  ] as const;
}
