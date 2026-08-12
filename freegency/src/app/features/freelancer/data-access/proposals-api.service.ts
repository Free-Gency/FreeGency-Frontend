import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateProposalDto } from '../model/proposal.model';

interface ApiResponse<T> {
  isSuccess: boolean;
  data?: T | null;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProposalsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/proposals`;

  /**
   * Submits a proposal for a project.
   * Supports file attachments via FormData.
   */
  create(dto: CreateProposalDto, attachments: File[]): Observable<string> {
    const formData = new FormData();

    // Add DTO fields to FormData using PascalCase to match backend DTO property names
    formData.append('ProjectId', dto.projectId);
    formData.append('ApplicantType', String(dto.applicantType));
    formData.append('CoverLetter', dto.coverLetter);
    formData.append('Approach', dto.approach);
    formData.append('ProposedBudget', String(dto.proposedBudget));

    // Add optional fields if present
    if (dto.teamId) {
      formData.append('TeamId', dto.teamId);
    }
    if (dto.proposedTimeline) {
      formData.append('ProposedTimeline', dto.proposedTimeline);
    }
    if (dto.similarLinksUrl) {
      formData.append('SimilarLinksUrl', dto.similarLinksUrl);
    }

    // Add attachments using the same property name as the backend DTO
    attachments.forEach((file) => {
      formData.append('Attachments', file, file.name);
    });


    // Backend returns the created Proposal object in data; map to its id
    return this.http
      .post<ApiResponse<any>>(this.baseUrl, formData)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to submit proposal.');
          }
          // Accept either a string id directly or an object containing an id property
          if (typeof res.data === 'string') return res.data;
          if (typeof res.data === 'object' && 'id' in res.data && typeof res.data.id === 'string') {
            return (res.data as any).id as string;
          }
          throw new Error('Unexpected response from create proposal endpoint.');
        }),
      );
  }
}
