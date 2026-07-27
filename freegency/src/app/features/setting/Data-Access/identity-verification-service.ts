import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, map, of } from 'rxjs';
import { 
  IdentityVerification, 
  VerificationStep, 
  DocumentUploadRequest, 
  DocumentUploadResponse,
  VerificationStatus,
  DocumentType,
  VerificationBenefits,
  ApiError 
} from '../../../shared/utils/identity-verification.interface';

@Injectable({
  providedIn: 'root'
})
export class IdentityVerificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/settings/identity-verification';
  
  readonly isLoading = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  
  readonly verificationData = signal<IdentityVerification>({
    overallStatus: 'not_started',
    verifiedBadge: false,
    escrowLimit: 5000,
    defaultEscrowLimit: 50000,
    steps: [
      {
        id: 'gov-id',
        type: 'government_id',
        label: 'Government ID',
        description: 'Upload a valid government-issued photo ID',
        status: 'not_started',
        required: true
      },
      {
        id: 'address-proof',
        type: 'address_proof',
        label: 'Proof of Address',
        description: 'Upload a recent utility bill or bank statement',
        status: 'not_started',
        required: true
      },
      {
        id: 'selfie',
        type: 'selfie',
        label: 'Selfie Verification',
        description: 'Take a quick selfie to verify your identity',
        status: 'not_started',
        required: true
      }
    ],
    completedSteps: 0,
    totalSteps: 3
  });

  readonly benefits = signal<VerificationBenefits[]>([
    {
      title: 'Verified Badge',
      description: 'Get a verified badge on your profile to build trust with clients',
      icon: 'badge',
      available: false
    },
    {
      title: 'Higher Escrow Limits',
      description: 'Access escrow limits up to $50,000 for large projects',
      icon: 'escrow',
      available: false
    },
    {
      title: 'Priority Support',
      description: 'Get priority access to our support team for faster resolution',
      icon: 'support',
      available: false
    },
    {
      title: 'Featured Listings',
      description: 'Appear higher in search results and get more visibility',
      icon: 'featured',
      available: false
    }
  ]);

  fetchVerificationStatus(): Observable<IdentityVerification> {
    this.isLoading.set(true);
    
    return this.http.get<IdentityVerification>(this.apiUrl).pipe(
      map((response) => {
        this.verificationData.set(response);
        this.updateBenefits(response.overallStatus === 'verified');
        this.isLoading.set(false);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        console.error('Failed to fetch verification status:', error);
        return of(this.verificationData());
      })
    );
  }

  uploadDocument(request: DocumentUploadRequest): Observable<DocumentUploadResponse> {
    this.isLoading.set(true);
    this.uploadProgress.set(0);
    
    const formData = new FormData();
    formData.append('stepId', request.stepId);
    formData.append('documentType', request.documentType);
    formData.append('file', request.file);
    
    if (request.metadata) {
      Object.entries(request.metadata).forEach(([key, value]) => {
        formData.append(`metadata[${key}]`, value);
      });
    }
    
    return this.http.post<DocumentUploadResponse>(
      `${this.apiUrl}/upload`, 
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: any) => {
        if (event.type === 1) { // UploadProgress
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(progress);
        }
        
        if (event.type === 4) { // HttpResponse
          const response = event.body as DocumentUploadResponse;
          this.updateStepStatus(request.stepId, response.status);
          this.isLoading.set(false);
          this.uploadProgress.set(0);
          return response;
        }
        
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.uploadProgress.set(0);
        return throwError(() => this.handleError(error));
      })
    ) as Observable<DocumentUploadResponse>;
  }

  startVerification(stepId: string): Observable<any> {
    this.isLoading.set(true);
    
    return this.http.post(`${this.apiUrl}/start`, { stepId }).pipe(
      map((response) => {
        this.updateStepStatus(stepId, 'in_progress');
        this.isLoading.set(false);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  retryVerification(stepId: string): Observable<any> {
    this.isLoading.set(true);
    
    return this.http.post(`${this.apiUrl}/retry`, { stepId }).pipe(
      map((response) => {
        this.updateStepStatus(stepId, 'in_progress');
        this.isLoading.set(false);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  private updateStepStatus(stepId: string, status: VerificationStatus): void {
    const currentData = this.verificationData();
    const updatedSteps = currentData.steps.map(step => 
      step.id === stepId ? { ...step, status, submittedAt: new Date().toISOString() } : step
    );
    
    const completedSteps = updatedSteps.filter(s => s.status === 'verified').length;
    
    this.verificationData.set({
      ...currentData,
      steps: updatedSteps,
      completedSteps,
      overallStatus: this.calculateOverallStatus(updatedSteps)
    });
  }

  private calculateOverallStatus(steps: VerificationStep[]): VerificationStatus {
    if (steps.every(s => s.status === 'verified')) return 'verified';
    if (steps.some(s => s.status === 'rejected')) return 'rejected';
    if (steps.some(s => s.status === 'under_review')) return 'under_review';
    if (steps.some(s => s.status === 'in_progress')) return 'in_progress';
    return 'not_started';
  }

  private updateBenefits(isVerified: boolean): void {
    this.benefits.update(benefits => 
      benefits.map(benefit => ({ ...benefit, available: isVerified }))
    );
  }

  private handleError(error: HttpErrorResponse): ApiError {
    if (error.status === 400) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.error?.message || 'Invalid document. Please check the requirements.',
        errors: error.error?.errors
      };
    }
    
    if (error.status === 413) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File is too large. Maximum size is 10MB.',
      };
    }
    
    if (error.status === 415) {
      return {
        code: 'UNSUPPORTED_FORMAT',
        message: 'File format not supported. Please upload JPG, PNG, or PDF.',
      };
    }
    
    if (error.status === 422) {
      return {
        code: 'UNPROCESSABLE_ENTITY',
        message: error.error?.message || 'Document could not be processed.',
      };
    }
    
    return {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}