import { Component, input, signal, computed, output } from '@angular/core';
import { DeveloperProfile } from '../../../model/portfolio.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-availability',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-availability.component.html',
  styleUrl: './portfolio-availability.component.css',
})
export class PortfolioAvailabilityComponent {
  profile = input.required<DeveloperProfile>();
  canEdit = input(true);
  availabilityChanged = output<boolean>();

  // Local user toggle override signal (null means use profile default)
  private localOverride = signal<boolean | null>(null);

  public isAvailable = computed(() => {
    const override = this.localOverride();
    if (override !== null) {
      return override;
    }
    return this.profile().isAvailable ?? true;
  });

  /** Soft timezone hint from country — avoid showing a fake PST default. */
  timezoneLabel = computed(() => {
    const country = (this.profile().country || '').trim().toLowerCase();
    if (!country) return '—';
    if (country.includes('egypt') || country === 'eg') return 'EET (UTC+2)';
    if (country.includes('saudi') || country.includes('emirates') || country.includes('uae') || country.includes('qatar')) {
      return 'GST (UTC+4)';
    }
    if (country.includes('united states') || country === 'usa' || country === 'us') return 'Local US time';
    if (country.includes('united kingdom') || country === 'uk' || country.includes('britain')) {
      return 'GMT (UTC+0)';
    }
    return country;
  });

  toggleAvailability() {
    const newState = !this.isAvailable();
    this.localOverride.set(newState);
    this.availabilityChanged.emit(newState);
  }
}