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
  availabilityChanged = output<boolean>();

  // Local user toggle override signal (null means use profile default)
  private localOverride = signal<boolean | null>(null);

  // Pure computed signal evaluating availability state reactively
  public isAvailable = computed(() => {
    const override = this.localOverride();
    if (override !== null) {
      return override;
    }
    return this.profile().isAvailable ?? true;
  });

  toggleAvailability() {
    const newState = !this.isAvailable();
    this.localOverride.set(newState);
    this.availabilityChanged.emit(newState);
  }
}