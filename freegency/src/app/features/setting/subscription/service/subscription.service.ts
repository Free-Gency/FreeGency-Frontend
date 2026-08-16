import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { ChangePlanRequest, Plan, PlanSnapshot } from '../model/subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/plan`;

  getPlans() {
    return this.http.get<Plan[]>(this.base);
  }

  getMySubscription() {
    return this.http.get<PlanSnapshot>(`${this.base}/me`);
  }

  changePlan(request: ChangePlanRequest) {
    return this.http.post<Plan>(`${this.base}/subscribe`, request);
  }
}