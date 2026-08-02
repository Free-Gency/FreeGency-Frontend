import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';

@Component({
  selector: 'app-developer-dashboard',
  imports: [DeveloperViewNavbarComponent],
  templateUrl: './developer-dashboard.component.html',
  styleUrl: './developer-dashboard.component.css',
})
export class DeveloperDashboardComponent {
  private readonly auth = inject(AuthService);

  protected readonly firstName = computed(() => this.auth.session()?.firstName?.trim() || 'there');
}
