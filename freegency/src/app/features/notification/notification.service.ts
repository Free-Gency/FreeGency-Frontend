import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { NotificationDto } from '../../shared/models/notification';
import { PagedResponse } from '../../shared/models/PagedResponse';
export interface UnreadNotificationCountDto {
  count: number;
}
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
   private readonly http = inject(HttpClient);
baseUrl=environment.apiBaseUrl;
  readonly unreadCount = signal(0);
  getNotifications(
  pageIndex = 1,
  pageSize = 10
) {
  return this.http.get<PagedResponse<NotificationDto>>(
    `${this.baseUrl}/api/v1/Notification/me`,
    {
      params: {
        pageIndex,
        pageSize,
      },
    }
  );
}
  getUnreadCount() {
    return this.http
      .get<UnreadNotificationCountDto>(
        `${this.baseUrl}/api/v1/Notification/unread-count`
      )
      .pipe(
        tap((result) => {
          this.unreadCount.set(result.count);
        })
      );
  }
}
