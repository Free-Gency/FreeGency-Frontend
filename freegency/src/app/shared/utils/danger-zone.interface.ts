export interface AccountStatus {
  isActive: boolean;
  deactivationDate?: string;
  scheduledDeletion?: string;
}

export interface BlockingCondition {
  type: 'active_projects' | 'wallet_balance' | 'pending_payments' | 'active_contracts';
  label: string;
  description: string;
  count?: number;
  amount?: number;
  actionLabel: string;
  actionRoute: string;
  resolved: boolean;
}

export interface DeactivationRequest {
  reason?: string;
  confirmation: boolean;
}

export interface DeletionRequest {
  password: string;
  reason?: string;
  confirmation: boolean;
}

export interface ApiResponse {
  message: string;
  success: boolean;
}

export interface AccountBlocks {
  canDelete: boolean;
  blockingConditions: BlockingCondition[];
}