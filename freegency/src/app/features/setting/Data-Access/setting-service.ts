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
import { DeveloperProfile } from '../../freelancer/model/portfolio.model'; // adjust path to your actual model location

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  // ---- Client ----
  getClientProfile(): Observable<ClientAccount> {
    return this.http.get<ClientAccount>(`${this.apiUrl}/api/v1/profiles/client/me`);
  }
  getClientInterests(): Observable<ProfileInterest[]> {
    return this.http.get<ProfileInterest[]>(`${this.apiUrl}/api/v1/profiles/client/me/interests`);
  }
  replaceClientInterests(dto: ProfileInterestsDto) {
    return this.http.put(`${this.apiUrl}/api/v1/profiles/client/me/interests`, dto);
  }
  updateClientProfile(formData: FormData) {
    return this.http.put(`${this.apiUrl}/api/v1/profiles/client/me`, formData);
  }

  // ---- Developer ----
  getDeveloperProfile(): Observable<DeveloperProfile> {
    return this.http.get<DeveloperProfile>(`${this.apiUrl}/api/v1/profiles/developer/me`);
  }
  getDeveloperInterests(): Observable<ProfileInterest[]> {
    return this.http.get<ProfileInterest[]>(`${this.apiUrl}/api/v1/profiles/developer/me/interests`);
  }
  replaceDeveloperInterests(dto: ProfileInterestsDto) {
    return this.http.put(`${this.apiUrl}/api/v1/profiles/developer/me/interests`, dto);
  }
  updateDeveloperProfile(formData: FormData) {
    // NOTE: backend may only expose POST (Create) for this right now, not PUT.
    // Swap to http.post(...) if PUT 404s.
    return this.http.put(`${this.apiUrl}/api/v1/profiles/developer/me`, formData);
  }

  // ---- Shared ----
  getCategories() {
    return this.http.get<ApiResponse<PagedResponse<Category>>>(`${this.apiUrl}/api/v1/categories`);
  }
}