import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Briefcase01Icon,
  Flag01Icon,
  Mail01Icon,
  Message01Icon,
  Notification01Icon,
  SmartPhone01Icon,
  TaskDone01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../core/auth/auth.service';
import { ToggleSwitchComponent } from '../../../shared/components/toggle-switch/toggle-switch.component';
import {
  DeveloperNotificationSettings,
  NotificationSettings,
  UpdateDeveloperNotificationSettings,
  UpdateNotificationSettings,
} from '../../../shared/models/NotificationSettings';
import { NotificationClientService } from '../Data-Access/notification-client-service';
import { NotificationDeveloperService } from '../Data-Access/notification-developer-service';

type ClientToggleKey = Exclude<keyof UpdateNotificationSettings, 'id'>;
type DeveloperToggleKey = Exclude<keyof UpdateDeveloperNotificationSettings, 'id'>;
type NotificationToggleKey = ClientToggleKey | DeveloperToggleKey;

type RoleSettings = NotificationSettings | DeveloperNotificationSettings;

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
  private readonly auth = inject(AuthService);
  private readonly clientNotificationService = inject(NotificationClientService);
  private readonly developerNotificationService = inject(NotificationDeveloperService);

  settings = signal<RoleSettings | null>(null);
  loading = signal(true);

  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected readonly notificationIcon = Notification01Icon as IconSvgObject;
  protected readonly inAppIcon = SmartPhone01Icon as IconSvgObject;
  protected readonly emailIcon = Mail01Icon as IconSvgObject;

  private readonly clientRows: NotificationRow[] = [
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

  private readonly developerRows: NotificationRow[] = [
    {
      title: 'Messages',
      description: 'Receive notifications when someone sends you a message.',
      icon: Message01Icon as IconSvgObject,
      inAppKey: 'messagesInApp',
      emailKey: 'messagesEmail',
    },
    {
      title: 'Projects',
      description: 'Receive notifications about project updates and proposals.',
      icon: Briefcase01Icon as IconSvgObject,
      inAppKey: 'projectsInApp',
      emailKey: 'projectsEmail',
    },
    {
      title: 'Milestones',
      description: 'Receive notifications when milestones are updated.',
      icon: TaskDone01Icon as IconSvgObject,
      inAppKey: 'milestonesInApp',
      emailKey: 'milestonesEmail',
    },
    {
      title: 'Wallet',
      description: 'Receive notifications whenever your wallet balance changes.',
      icon: Wallet01Icon as IconSvgObject,
      inAppKey: 'walletInApp',
      emailKey: 'walletEmail',
    },
    {
      title: 'Teams',
      description: 'Receive notifications about team invites and join requests.',
      icon: UserGroupIcon as IconSvgObject,
      inAppKey: 'teamsInApp',
      emailKey: 'teamsEmail',
    },
  ];

  protected readonly rows = computed(() =>
    this.isDeveloper() ? this.developerRows : this.clientRows,
  );

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.rows().length }, (_, i) => i + 1),
  );

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.settings.set(null);

    if (this.isDeveloper()) {
      this.developerNotificationService.getSettings().subscribe({
        next: (res: DeveloperNotificationSettings) => {
          this.settings.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
      return;
    }

    this.clientNotificationService.getSettings().subscribe({
      next: (res: NotificationSettings) => {
        this.settings.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  isEnabled(key: NotificationToggleKey): boolean {
    const current = this.settings();
    if (!current) return false;
    return Boolean((current as unknown as Record<string, boolean>)[key]);
  }

  toggle(key: NotificationToggleKey) {
    const current = this.settings();
    if (!current) return;

    const updated = {
      ...current,
      [key]: !this.isEnabled(key),
    } as RoleSettings;

    this.settings.set(updated);

    if (this.isDeveloper()) {
      this.developerNotificationService
        .update(this.toDeveloperUpdateDto(updated as DeveloperNotificationSettings))
        .subscribe({
          error: () => {
            this.settings.set(current);
          },
        });
      return;
    }

    this.clientNotificationService
      .update(this.toClientUpdateDto(updated as NotificationSettings))
      .subscribe({
        error: () => {
          this.settings.set(current);
        },
      });
  }

  private toClientUpdateDto(settings: NotificationSettings): UpdateNotificationSettings {
    return {
      id: settings.id,
      newMessageInApp: settings.newMessageInApp,
      newMessageEmail: settings.newMessageEmail,
      proposalReceivedInApp: settings.proposalReceivedInApp,
      proposalReceivedEmail: settings.proposalReceivedEmail,
      milestoneAddedInApp: settings.milestoneAddedInApp,
      milestoneAddedEmail: settings.milestoneAddedEmail,
      walletUpdatedInApp: settings.walletUpdatedInApp,
      walletUpdatedEmail: settings.walletUpdatedEmail,
    };
  }

  private toDeveloperUpdateDto(
    settings: DeveloperNotificationSettings,
  ): UpdateDeveloperNotificationSettings {
    return {
      id: settings.id,
      messagesInApp: settings.messagesInApp,
      messagesEmail: settings.messagesEmail,
      projectsInApp: settings.projectsInApp,
      projectsEmail: settings.projectsEmail,
      milestonesInApp: settings.milestonesInApp,
      milestonesEmail: settings.milestonesEmail,
      walletInApp: settings.walletInApp,
      walletEmail: settings.walletEmail,
      teamsInApp: settings.teamsInApp,
      teamsEmail: settings.teamsEmail,
    };
  }
}
