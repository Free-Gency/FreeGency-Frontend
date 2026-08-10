import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import {
  DeveloperNotificationSettings,
  UpdateDeveloperNotificationSettings,
} from '../../../shared/models/NotificationSettings';

@Injectable({
  providedIn: 'root',
})
export class NotificationDeveloperService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getSettings() {
    return this.http.get<DeveloperNotificationSettings>(
      this.api + '/api/v1/DeveloperNotficationSetting/me',
    );
  }

  update(dto: UpdateDeveloperNotificationSettings) {
    return this.http.put(this.api + '/api/v1/DeveloperNotficationSetting', dto);
  }
}
