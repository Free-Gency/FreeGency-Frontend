import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Plan, PlanSnapshot, BillingPeriod } from './model/subscription.models';
import { SubscriptionService } from './service/subscription.service';

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.css',
})
export class SubscriptionPage implements OnInit {
  private readonly api = inject(SubscriptionService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly currentSnapshot = signal<PlanSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly subscribing = signal<string | null>(null); 
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly billingPeriod = signal<BillingPeriod>('Monthly');

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.api.getPlans().subscribe({
      next: (plans) => this.plans.set(plans),
    });
    this.api.getMySubscription().subscribe({
      next: (snapshot) => {
        this.currentSnapshot.set(snapshot);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setBillingPeriod(period: BillingPeriod): void {
    this.billingPeriod.set(period);
  }

  protected isCurrentPlan(plan: Plan): boolean {
    return this.currentSnapshot()?.planName === plan.name;
  }

  protected subscribe(plan: Plan): void {
    this.errorMessage.set(null);
    this.subscribing.set(plan.id);

    this.api.changePlan({ planId: plan.id, billingPeriod: this.billingPeriod() }).subscribe({
      next: () => {
        this.subscribing.set(null);
        this.loadData();
      },
      error: (err: HttpErrorResponse) => {
        this.subscribing.set(null);
        this.errorMessage.set(
          err.error?.message ?? 'Something went wrong subscribing to this plan.',
        );
      },
    });
  }
}