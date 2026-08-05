import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  OnboardingHeaderComponent,
  type OnboardingStep,
} from '../../../../shared/components/onboarding-header/onboarding-header.component';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';

export interface DeveloperOnboardingRouteData {
  step: OnboardingStep;
  filled?: boolean;
  center?: boolean;
}

@Component({
  selector: 'app-developer-onboarding-layout',
  imports: [AuthAmbientBgComponent, OnboardingHeaderComponent, RouterOutlet],
  templateUrl: './developer-onboarding-layout.component.html',
})
export class DeveloperOnboardingLayoutComponent {
  private readonly router = inject(Router);

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.readChildData()),
    ),
    { initialValue: this.readChildData() },
  );

  protected readonly step = computed(() => this.routeData().step);
  protected readonly filled = computed(() => !!this.routeData().filled);
  protected readonly center = computed(() => this.routeData().center !== false);
  protected readonly stepLabels: [string, string, string] = ['Profile', 'Expertise', 'Portfolio'];

  private readChildData(): DeveloperOnboardingRouteData {
    let snapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    const data = (snapshot.data ?? {}) as Partial<DeveloperOnboardingRouteData>;
    return {
      step: data.step ?? 1,
      filled: data.filled,
      center: data.center,
    };
  }
}
