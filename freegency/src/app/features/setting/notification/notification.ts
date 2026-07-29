import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ToggleSwitchComponent } from '../../../shared/components/toggle-switch/toggle-switch.component';
import { NotificationsService } from '../Data-Access/notifications-service';
import { DigestFrequency } from '../../../shared/utils/notification-preferences.interface';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NotificationSettings, UpdateNotificationSettings } from '../../../shared/models/NotificationSettings';
import { NotificationClientService } from '../Data-Access/notification-client-service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    ToggleSwitchComponent,
    FormsModule
  ],
  templateUrl: './notification.html',
  styleUrls: ['./notification.css']
})
export class Notifications{
 private notificationService = inject(NotificationClientService);

  settings = signal<NotificationSettings | null>(null);

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings() {
    this.notificationService.getSettings().subscribe({
      next: (res) => {
        this.settings.set(res);
      }
    });
  }

  toggle(key: keyof UpdateNotificationSettings) {

    const current = this.settings();

    if (!current) return;

    const updated = {
      ...current,
      [key]: !current[key]
    };

    this.settings.set(updated);

    this.notificationService.update({
      id:updated.id,
      newMessageInApp: updated.newMessageInApp,
      newMessageEmail: updated.newMessageEmail,

      proposalReceivedInApp: updated.proposalReceivedInApp,
      proposalReceivedEmail: updated.proposalReceivedEmail,

      milestoneAddedInApp: updated.milestoneAddedInApp,
      milestoneAddedEmail: updated.milestoneAddedEmail,

      walletUpdatedInApp: updated.walletUpdatedInApp,
      walletUpdatedEmail: updated.walletUpdatedEmail
    }).subscribe({
      error: () => {
        this.settings.set(current);
      }
    });
  }
  
}