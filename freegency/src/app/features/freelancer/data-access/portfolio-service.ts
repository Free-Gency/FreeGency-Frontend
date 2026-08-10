import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import {
  DeveloperProfile,
  SocialLinkDto,
  PortfolioProjectDto,
  ApiResponse,
} from '../../freelancer/model/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getProfile(): Observable<DeveloperProfile> {
    return this.http
      .get<DeveloperProfile>(`${this.baseUrl}/api/v1/profiles/developer/me`);
  }

  getSocialLinks(): Observable<SocialLinkDto[]> {
    return this.http
      .get<SocialLinkDto[]>(`${this.baseUrl}/api/v1/SocialLink/me`);
  }

  getPortfolioProjects(): Observable<PortfolioProjectDto[]> {
    return this.http
      .get<any>(`${this.baseUrl}/api/v1/profiles/developer/me/portfolio-projects`)
      .pipe(
        map((res) => res?.data || res || []) 
      );
  }
}