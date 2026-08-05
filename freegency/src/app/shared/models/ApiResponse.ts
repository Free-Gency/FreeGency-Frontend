export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  isFailure: boolean;
  message?: string | null;
}