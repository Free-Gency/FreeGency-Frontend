import { Component, inject, OnInit, signal } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Flag01Icon,
  Mail01Icon,
  Message01Icon,
  Notification01Icon,
  SmartPhone01Icon,
  TaskDone01Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { ToggleSwitchComponent } from '../../../shared/components/toggle-switch/toggle-switch.component';
import {
  NotificationSettings,
  UpdateNotificationSettings,
} from '../../../shared/models/NotificationSettings';
import { NotificationClientService } from '../Data-Access/notification-client-service';

type NotificationToggleKey = Exclude<keyof UpdateNotificationSettings, 'id'>;

interface NotificationRow {
  title: string;
  description: string;
  icon: IconSvgObject;
  inAppKey: NotificationToggleKey;
  emailKey: NotificationToggleKey;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [ToggleSwitchComponent, HugeiconsIconComponent],
  templateUrl: './notification.html',
  styleUrls: ['./notification.css'],
})
export class Notifications implements OnInit {
  private notificationService = inject(NotificationClientService);

  settings = signal<NotificationSettings | null>(null);
  loading = signal(true);

  protected readonly notificationIcon = Notification01Icon as IconSvgObject;
  protected readonly inAppIcon = SmartPhone01Icon as IconSvgObject;
  protected readonly emailIcon = Mail01Icon as IconSvgObject;

  protected readonly rows: NotificationRow[] = [
    {
      title: 'New Messages',
      description: 'Receive notifications when someone sends you a message.',
      icon: Message01Icon as IconSvgObject,
      inAppKey: 'newMessageInApp',
      emailKey: 'newMessageEmail',
    },
    {
      title: 'Proposal Received',
      description: 'Receive notifications when a freelancer submits a proposal.',
      icon: Flag01Icon as IconSvgObject,
      inAppKey: 'proposalReceivedInApp',
      emailKey: 'proposalReceivedEmail',
    },
    {
      title: 'Milestone Added',
      description: 'Receive notifications when a milestone is added.',
      icon: TaskDone01Icon as IconSvgObject,
      inAppKey: 'milestoneAddedInApp',
      emailKey: 'milestoneAddedEmail',
    },
    {
      title: 'Wallet Updated',
      description: 'Receive notifications whenever your wallet balance changes.',
      icon: Wallet01Icon as IconSvgObject,
      inAppKey: 'walletUpdatedInApp',
      emailKey: 'walletUpdatedEmail',
    },
  ];

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.notificationService.getSettings().subscribe({
      next: (res) => {
        this.settings.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  toggle(key: NotificationToggleKey) {
    const current = this.settings();
    if (!current) return;

    const updated = {
      ...current,
      [key]: !current[key],
    };

    this.settings.set(updated);

    this.notificationService
      .update({
        id: updated.id,
        newMessageInApp: updated.newMessageInApp,
        newMessageEmail: updated.newMessageEmail,
        proposalReceivedInApp: updated.proposalReceivedInApp,
        proposalReceivedEmail: updated.proposalReceivedEmail,
        milestoneAddedInApp: updated.milestoneAddedInApp,
        milestoneAddedEmail: updated.milestoneAddedEmail,
        walletUpdatedInApp: updated.walletUpdatedInApp,
        walletUpdatedEmail: updated.walletUpdatedEmail,
      })
      .subscribe({
        error: () => {
          this.settings.set(current);
        },
      });
  }
}
