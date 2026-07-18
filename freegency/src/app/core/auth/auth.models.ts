export type UserMode = 'Client' | 'Developer';

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

export interface StoredSession {
  token: string;
  refreshToken: string;
  refreshTokenExpiration: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  id: string;
}
