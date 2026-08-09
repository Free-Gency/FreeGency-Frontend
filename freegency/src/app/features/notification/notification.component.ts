  import {
    Component,
    DestroyRef,
    effect,
    HostListener,
    inject,
    signal,
  } from '@angular/core';
  import { DatePipe } from '@angular/common';
  import { Router } from '@angular/router';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

  import {
    HugeiconsIconComponent,
    type IconSvgObject,
  } from '@hugeicons/angular';

  import { Notification02Icon } from '@hugeicons/core-free-icons';

  import { NotificationDto } from '../../shared/models/notification';
  import { PagedResponse } from '../../shared/models/Proposal';
  import { NotificationService } from './notification.service';
  import { SignalrService } from '../../core/Signalr/signalr-service';

  @Component({
    selector: 'app-notification',
    standalone: true,
    imports: [
      HugeiconsIconComponent,
      DatePipe,
    ],
    templateUrl: './notification.component.html',
    styleUrl: './notification.component.css',
  })
  export class NotificationComponent {
    private readonly notificationApi = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);

    protected readonly notificationIcon =
      Notification02Icon as IconSvgObject;

    protected readonly notifications =
      signal<NotificationDto[]>([]);

    protected readonly notificationLoading =
      signal(false);

    protected readonly notificationOpen =
      signal(false);
      protected readonly signalrService =
    inject(SignalrService);
    protected readonly notificationPagination =
      signal<PagedResponse<NotificationDto> | null>(null);

    protected readonly unreadCount = this.notificationApi.unreadCount;

    protected toggleNotifications(event: MouseEvent): void {
      event.stopPropagation();

      this.notificationOpen.update(open => !open);

      if (this.notificationOpen()) {
        this.loadNotifications(1);
      }
    }
 private lastNotificationId: string | null = null;

private readonly notificationSignalEffect = effect(() => {
  const notification = this.signalrService.NotificationSignal();

  if (!notification) return;

  if (notification.id === this.lastNotificationId) {
    return;
  }

  this.lastNotificationId = notification.id;

  this.unreadCount.update(count => count + 1);
});
    ngOnInit(): void {
    this.loadUnreadCount();
  }
  private loadUnreadCount(): void {
    this.notificationApi
      .getUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
    private loadNotifications(pageNumber = 1): void {
    if (this.notificationLoading()) return;

    this.notificationLoading.set(true);

    this.notificationApi
      .getNotifications(pageNumber, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.notifications.set(result.items);
          this.notificationPagination.set(result);

          this.notificationLoading.set(false);
        },

        error: () => {
          this.notificationLoading.set(false);
        },
      });
  }

    protected nextPage(): void {
      const pagination = this.notificationPagination();

      if (!pagination?.hasNextPage) return;

      this.loadNotifications(
        pagination.pageNumber + 1
      );
    }

    protected previousPage(): void {
      const pagination = this.notificationPagination();

      if (!pagination?.hasPreviousPage) return;

      this.loadNotifications(
        pagination.pageNumber - 1
      );
    }

    protected openNotification(
      notification: NotificationDto
    ): void {
      if (!notification.actionUrl) return;

      this.notificationOpen.set(false);

      void this.router.navigateByUrl(
        notification.actionUrl
      );
    }

    @HostListener('document:click')
    protected onDocumentClick(): void {
      this.notificationOpen.set(false);
    }
  }