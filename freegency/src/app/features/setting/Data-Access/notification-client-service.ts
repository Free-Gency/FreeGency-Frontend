import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { NotificationSettings, UpdateNotificationSettings } from '../../../shared/models/NotificationSettings';

@Injectable({
  providedIn: 'root',
})
export class NotificationClientService {
  http=inject(HttpClient);
  api=environment.apiBaseUrl;
  getSettings() {
    return this.http.get<NotificationSettings>(this.api+"/api/v1/ClientNotificationSetting/me");
  }

  update(dto: UpdateNotificationSettings) {
    return this.http.put(this.api+"/api/v1/ClientNotificationSetting", dto);
  }
}
