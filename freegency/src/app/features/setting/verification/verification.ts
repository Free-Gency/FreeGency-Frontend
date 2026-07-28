import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { IdentityVerificationService } from '../Data-Access/identity-verification-service';
import { VerificationStatusBadgeComponent } from '../../../shared/components/verification-status-badge/verification-status-badge.component';
import { DocumentUploadComponent } from '../../../shared/components/document-upload/document-upload.component';
import { DocumentUploadRequest, DocumentType } from '../../../shared/utils/identity-verification.interface';
import { Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-identity-verification',
  standalone: true,
  imports: [
    DatePipe,
    VerificationStatusBadgeComponent,
    DocumentUploadComponent
  ],
  templateUrl: './verification.html',
  styleUrls: ['./verification.css']
})
export class Verification implements OnInit, OnDestroy {
  private readonly verificationService = inject(IdentityVerificationService);
  private subscription = new Subscription();
  
  readonly verificationData = this.verificationService.verificationData;
  readonly benefits = this.verificationService.benefits;
  readonly isLoading = this.verificationService.isLoading;
  readonly uploadProgress = this.verificationService.uploadProgress;
  
  readonly showUploadSection = signal<boolean>(false);
  readonly activeStepId = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error'>('success');
  
  readonly overallStatus = computed(() => this.verificationData().overallStatus);
  readonly completedSteps = computed(() => this.verificationData().completedSteps);
  readonly totalSteps = computed(() => this.verificationData().totalSteps);
  readonly progressPercentage = computed(() => 
    (this.completedSteps() / this.totalSteps()) * 100
  );
  
  readonly isVerified = computed(() => 
    this.overallStatus() === 'verified'
  );

  ngOnInit(): void {
    this.loadVerificationStatus();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  private loadVerificationStatus(): void {
    this.subscription.add(
      this.verificationService.fetchVerificationStatus().subscribe()
    );
  }
  
  startVerification(stepId: string): void {
    this.activeStepId.set(stepId);
    this.showUploadSection.set(true);
    
    this.subscription.add(
      this.verificationService.startVerification(stepId).subscribe({
        next: () => {
          this.showToast('Verification started', 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to start verification', 'error');
        }
      })
    );
  }
  
  onFileSelected(stepId: string, file: File): void {
    const request: DocumentUploadRequest = {
      stepId: stepId,
      documentType: this.getDocumentType(stepId),
      file: file
    };
    
    this.subscription.add(
      this.verificationService.uploadDocument(request).subscribe({
        next: (response) => {
          if (response && response.success) {
            this.showToast('Document uploaded successfully', 'success');
            this.showUploadSection.set(false);
            this.activeStepId.set(null);
          }
        },
        error: (error) => {
          this.showToast(error.message || 'Upload failed', 'error');
        }
      })
    );
  }
  
  retryVerification(stepId: string): void {
    this.subscription.add(
      this.verificationService.retryVerification(stepId).subscribe({
        next: () => {
          this.showUploadSection.set(true);
          this.activeStepId.set(stepId);
          this.showToast('Retry verification started', 'success');
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to retry verification', 'error');
        }
      })
    );
  }
  
  private getDocumentType(stepId: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      'gov-id': 'government_id',
      'address-proof': 'government_id', // Could be different
      'selfie': 'government_id'
    };
    return typeMap[stepId] || 'government_id';
  }
  
  getStepIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'government_id': 'id-card',
      'address_proof': 'home',
      'selfie': 'camera',
      'business_verification': 'building'
    };
    return iconMap[type] || 'document';
  }
  
  showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}