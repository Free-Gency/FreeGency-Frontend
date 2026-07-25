export type UserMode = 'Client' | 'Developer';

export const CLIENT_ONBOARDING_PATH = '/auth/client-onboarding';
export const CLIENT_HOME_PATH = '/client/home';
export const DEVELOPER_DASHBOARD_PATH = '/developer/dashboard';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  phoneNumber: string;
  mode: UserMode;
}

export interface AuthResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  activeProfileMode: UserMode | string | null;
  hasCompletedOnboarding: boolean;
  token: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiration: string;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface StoredSession {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  activeProfileMode: UserMode | null;
  hasCompletedOnboarding: boolean;
  token: string;
  refreshToken: string;
  refreshTokenExpiration: string;
}
