import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProfileInterest {
  id: string;
  name?: string;
  nameEn?: string;
  imageCover?: string | null;
  specialties?: ProfileSpecialty[];
}

export interface ProfileSpecialty {
  id: string;
  nameAr?: string;
  nameEn?: string;
  skills?: { id: string; name?: string }[];
}

/** Fields the onboarding/profile UI actually reads. */
export interface ClientAccountResponse {
  firstName: string;
  lastName: string;
  country: string | null;
  profileImage: string | null;
  bio: string | null;
}

export interface DeveloperAccountResponse {
  id?: string;
  firstName: string;
  lastName: string;
  country?: string | null;
  profileImage: string | null;
  bio: string | null;
  interests?: ProfileInterest[];
}

export interface UpdateClientProfileRequest {
  firstName: string;
  lastName: string;
  country?: string | null;
  bio?: string | null;
  profileImage?: File | null;
}

export type UpdateDeveloperProfileRequest = UpdateClientProfileRequest;

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getClientProfile(): Observable<ClientAccountResponse> {
    return this.http.get<ClientAccountResponse>(`${this.baseUrl}/client/me`);
  }

  getDeveloperProfile(): Observable<DeveloperAccountResponse> {
    return this.http.get<DeveloperAccountResponse>(`${this.baseUrl}/developer/me`);
  }

  /** Nested interests → specialties → skills tree. */
  getClientInterests(): Observable<ProfileInterest[]> {
    return this.http.get<ProfileInterest[]>(`${this.baseUrl}/client/me/interests`);
  }

  updateClientProfile(request: UpdateClientProfileRequest): Observable<void> {
    return this.putProfileForm(`${this.baseUrl}/client/me`, request);
  }

  updateDeveloperProfile(request: UpdateDeveloperProfileRequest): Observable<void> {
    return this.putProfileForm(`${this.baseUrl}/developer/me`, request);
  }

  completeOnboarding(): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/onboarding/complete`, null, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  replaceClientInterests(categoryIds: string[]): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/client/me/interests`, { categoryIds }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  replaceDeveloperInterests(categoryIds: string[]): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/developer/me/interests`, { categoryIds }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  replaceDeveloperSpecialties(specialtyIds: string[]): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/developer/me/specialties`, { specialtyIds }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  replaceDeveloperSkills(skillIds: string[]): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/developer/me/skills`, { skillIds }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  private putProfileForm(url: string, request: UpdateClientProfileRequest): Observable<void> {
    const form = new FormData();
    form.append('FirstName', request.firstName);
    form.append('LastName', request.lastName);

    if (request.country) {
      form.append('Country', request.country);
    }

    if (request.bio != null) {
      form.append('Bio', request.bio);
    }

    if (request.profileImage) {
      form.append('ProfileImage', request.profileImage, request.profileImage.name);
    }

    return this.http.put(url, form, { responseType: 'text' }).pipe(map(() => undefined));
  }
}
