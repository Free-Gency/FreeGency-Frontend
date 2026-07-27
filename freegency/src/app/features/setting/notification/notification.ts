import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ToggleSwitchComponent } from '../../../shared/components/toggle-switch/toggle-switch.component';
import { NotificationsService } from '../Data-Access/notifications-service';
import { DigestFrequency } from '../../../shared/utils/notification-preferences.interface';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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
export class Notifications implements OnInit, OnDestroy {
  private readonly notificationsService = inject(NotificationsService);
  private subscription = new Subscription();
  
  readonly preferences = this.notificationsService.preferences;
  readonly isLoading = this.notificationsService.isLoading;
  
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error'>('success');
  
  readonly emailSettings = computed(() => [
    {
      id: 'newMessages',
      key: 'newMessages',
      label: 'New Messages',
      description: 'Get notified when you receive a new message from clients or freelancers.',
      enabled: this.preferences().email.newMessages
    },
    {
      id: 'newProjects',
      key: 'newProjects',
      label: 'New Projects',
      description: 'Receive alerts when new projects matching your skills are posted.',
      enabled: this.preferences().email.newProjects
    },
    {
      id: 'projectUpdates',
      key: 'projectUpdates',
      label: 'Project Updates',
      description: 'Stay informed about changes to your active projects.',
      enabled: this.preferences().email.projectUpdates
    },
    {
      id: 'paymentReceived',
      key: 'paymentReceived',
      label: 'Payment Received',
      description: 'Get notified when you receive payments for completed work.',
      enabled: this.preferences().email.paymentReceived
    },
    {
      id: 'weeklyDigest',
      key: 'weeklyDigest',
      label: 'Weekly Digest',
      description: 'Receive a weekly summary of your activity and opportunities.',
      enabled: this.preferences().email.weeklyDigest
    },
    {
      id: 'marketingEmails',
      key: 'marketingEmails',
      label: 'Marketing Emails',
      description: 'Receive tips, product updates, and promotional offers.',
      enabled: this.preferences().email.marketingEmails
    }
  ]);
  
  readonly pushSettings = computed(() => [
    {
      id: 'pushMessages',
      key: 'newMessages',
      label: 'New Messages',
      description: 'Push notifications for new messages in real-time.',
      enabled: this.preferences().push.newMessages
    },
    {
      id: 'pushProjectUpdates',
      key: 'projectUpdates',
      label: 'Project Updates',
      description: 'Instant alerts for important project milestones.',
      enabled: this.preferences().push.projectUpdates
    },
    {
      id: 'pushPayment',
      key: 'paymentReceived',
      label: 'Payment Received',
      description: 'Immediate notification when payments are processed.',
      enabled: this.preferences().push.paymentReceived
    },
    {
      id: 'pushApplications',
      key: 'applicationUpdates',
      label: 'Application Updates',
      description: 'Get notified when your job applications are reviewed.',
      enabled: this.preferences().push.applicationUpdates
    }
  ]);
  
  readonly digestFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'never', label: 'Never' }
  ];
  
  readonly selectedDigestFrequency = computed(() => 
    this.preferences().digestFrequency
  );
  
  readonly quietHoursEnabled = computed(() => 
    this.preferences().quietHoursEnabled
  );
  
  readonly quietHoursStart = computed(() => 
    this.preferences().quietHoursStart
  );
  
  readonly quietHoursEnd = computed(() => 
    this.preferences().quietHoursEnd
  );

  ngOnInit(): void {
    this.loadPreferences();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  private loadPreferences(): void {
    this.subscription.add(
      this.notificationsService.fetchPreferences().subscribe({
        error: (error) => {
          this.showToast('Failed to load notification preferences', 'error');
        }
      })
    );
  }
  
  onEmailToggle(setting: any): void {
    const newValue = !setting.enabled;
    
    this.subscription.add(
      this.notificationsService.updateEmailPreference(setting.key, newValue).subscribe({
        next: () => {
          this.showToast(`${setting.label} ${newValue ? 'enabled' : 'disabled'}`, 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to update preference', 'error');
        }
      })
    );
  }
  
  onPushToggle(setting: any): void {
    const newValue = !setting.enabled;
    
    // Check if browser supports notifications
    if (newValue && !('Notification' in window)) {
      this.showToast('Push notifications are not supported in your browser', 'error');
      return;
    }
    
    if (newValue && Notification.permission === 'default') {
      this.requestNotificationPermission(setting);
      return;
    }
    
    this.subscription.add(
      this.notificationsService.updatePushPreference(setting.key, newValue).subscribe({
        next: () => {
          this.showToast(`${setting.label} ${newValue ? 'enabled' : 'disabled'}`, 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to update preference', 'error');
        }
      })
    );
  }
  
  private requestNotificationPermission(setting: any): void {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        this.subscription.add(
          this.notificationsService.updatePushPreference(setting.key, true).subscribe({
            next: () => {
              this.showToast('Push notifications enabled', 'success');
            },
            error: (error) => {
              this.showToast(error.message || 'Failed to enable push notifications', 'error');
            }
          })
        );
      } else {
        this.showToast('Push notification permission denied', 'error');
      }
    });
  }
  
  onDigestFrequencyChange(frequency: DigestFrequency): void {
    this.subscription.add(
      this.notificationsService.updateDigestFrequency(frequency).subscribe({
        next: () => {
          const label = this.digestFrequencies.find(f => f.value === frequency)?.label;
          this.showToast(`Digest frequency set to ${label?.toLowerCase()}`, 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to update digest frequency', 'error');
        }
      })
    );
  }
  
  onQuietHoursToggle(enabled: boolean): void {
    if (enabled) {
      this.subscription.add(
        this.notificationsService.updateQuietHours(true).subscribe({
          next: () => {
            this.showToast('Quiet hours enabled', 'success');
          },
          error: (error) => {
            this.showToast(error.message || 'Failed to enable quiet hours', 'error');
          }
        })
      );
    } else {
      this.subscription.add(
        this.notificationsService.updateQuietHours(false).subscribe({
          next: () => {
            this.showToast('Quiet hours disabled', 'success');
          },
          error: (error) => {
            this.showToast(error.message || 'Failed to disable quiet hours', 'error');
          }
        })
      );
    }
  }
  
  onQuietHoursTimeChange(type: 'start' | 'end', time: string): void {
    const update = type === 'start' 
      ? { start: time } 
      : { end: time };
    
    this.subscription.add(
      this.notificationsService.updateQuietHours(
        this.quietHoursEnabled(),
        type === 'start' ? time : undefined,
        type === 'end' ? time : undefined
      ).subscribe({
        next: () => {
          this.showToast(`Quiet hours ${type} time updated`, 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to update quiet hours', 'error');
        }
      })
    );
  }
  
  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}