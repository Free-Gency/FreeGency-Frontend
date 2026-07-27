import { Component, signal, computed } from '@angular/core';
import { ToggleSwitchComponent } from '../../../shared/components/toggle-switch/toggle-switch.component';
import { ChangePasswordModalComponent } from './change-password-modal/change-password-modal.component';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [ToggleSwitchComponent, ChangePasswordModalComponent],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.css']
})
export class SecurityComponent {
  readonly twoFactorEnabled = signal<boolean>(false);
  readonly showPasswordModal = signal<boolean>(false);
  readonly lastPasswordChange = signal<string>('3 months ago');
  
  readonly twoFactorStatusText = computed<string>(() => 
    this.twoFactorEnabled() ? 'Enabled' : 'Disabled'
  );
  
  readonly twoFactorStatusClass = computed<string>(() => 
    this.twoFactorEnabled() ? 'status-enabled' : 'status-disabled'
  );

  onPasswordChange(): void {
    this.showPasswordModal.set(true);
  }

  onClosePasswordModal(): void {
    this.showPasswordModal.set(false);
  }

  onPasswordChanged(): void {
    this.lastPasswordChange.set('Just now');
    this.showPasswordModal.set(false);
  }

  onTwoFactorToggle(enabled: boolean): void {
    this.twoFactorEnabled.set(enabled);
    // TODO: Implement API call to update 2FA settings
    // API Endpoint: PUT /api/settings/security/two-factor
    // Body: { enabled: boolean }
  }
}