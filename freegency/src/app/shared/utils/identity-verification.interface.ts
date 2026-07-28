export type VerificationStatus = 'not_started' | 'in_progress' | 'under_review' | 'verified' | 'rejected' | 'expired';

export type DocumentType = 'government_id' | 'passport' | 'drivers_license' | 'national_id';

export interface VerificationStep {
  id: string;
  type: 'government_id' | 'address_proof' | 'selfie' | 'business_verification';
  label: string;
  description: string;
  status: VerificationStatus;
  required: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  documentType?: DocumentType;
  documentUrl?: string;
  expiryDate?: string;
}

export interface IdentityVerification {
  overallStatus: VerificationStatus;
  verifiedBadge: boolean;
  escrowLimit: number;
  defaultEscrowLimit: number;
  steps: VerificationStep[];
  completedSteps: number;
  totalSteps: number;
}

export interface DocumentUploadRequest {
  stepId: string;
  documentType: DocumentType;
  file: File;
  metadata?: Record<string, string>;
}

export interface DocumentUploadResponse {
  success: boolean;
  stepId: string;
  documentUrl: string;
  status: VerificationStatus;
  message: string;
}

export interface VerificationBenefits {
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}