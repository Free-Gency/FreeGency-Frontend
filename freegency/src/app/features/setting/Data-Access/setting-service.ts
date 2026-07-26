import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { ClientAccount } from '../../../shared/models/client-account.model';
import { Observable } from 'rxjs';
import { PagedResponse } from '../../../shared/models/PagedResponse';
import { Category } from '../../../shared/models/Category';
import { ProfileInterest } from '../../../shared/models/profile-interest';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { ProfileInterestsDto } from '../../../shared/models/UpdateClientInterestsRequest';
@Injectable({
  providedIn: 'root',
})
export class SettingService {
   private http = inject(HttpClient);

  private apiUrl = environment.apiBaseUrl;

  getClientProfile(): Observable<ClientAccount> {
    return this.http.get<ClientAccount>(
      `${this.apiUrl}/api/v1/profiles/client/me`
    );
  }
  getClientInterests(): Observable<ProfileInterest[]> {
  return this.http.get<ProfileInterest[]>(
    `${this.apiUrl}/api/v1/profiles/client/me/interests`
  );
}
replaceClientInterests(dto: ProfileInterestsDto) {
  return this.http.put(
    `${this.apiUrl}/api/v1/profiles/client/me/interests`,
    dto
  );
}
getCategories() {
 return this.http.get<ApiResponse<PagedResponse<Category>>>(
    `${this.apiUrl}/api/v1/categories`
  );
}
updateClientProfile(formData: FormData) {
  return this.http.put(
    `${this.apiUrl}/api/v1/profiles/client/me`,
    formData
  );
}
}
