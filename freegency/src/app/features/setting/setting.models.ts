export interface SecurityOverview {
  lastPasswordChangeAt: string; // ISO date
  twoFactorEnabled: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}