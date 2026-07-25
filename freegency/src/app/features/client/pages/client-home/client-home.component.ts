import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';

@Component({
  selector: 'app-client-home',
  imports: [HugeiconsIconComponent, ClientViewNavbarComponent, RouterLink],
  templateUrl: './client-home.component.html',
  styleUrl: './client-home.component.css',
})
export class ClientHomeComponent {
  private readonly auth = inject(AuthService);

  protected readonly createIcon = Add01Icon as IconSvgObject;

  protected readonly firstName = computed(
    () => this.auth.session()?.firstName?.trim() || 'there',
  );
}
