import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-developer-dashboard',
  imports: [HugeiconsIconComponent],
  templateUrl: './developer-dashboard.component.html',
  styleUrl: './developer-dashboard.component.css',
})
export class DeveloperDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly logoutIcon = Logout01Icon as IconSvgObject;

  protected readonly firstName = computed(
    () => this.auth.session()?.firstName?.trim() || 'there',
  );

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
