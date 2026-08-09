import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a user-readable message from a backend/Angular error response.
 * Handles ASP.NET problem-details (`errors`), ApiResponse (`error.message`)
 * and plain messages before falling back to a generic text.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as {
      errors?: Record<string, string[]>;
      message?: string;
      error?: { message?: string } | string;
    } | null;

    if (body?.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors).flat().filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    if (typeof body?.error === 'object' && body.error?.message) return body.error.message;
    if (typeof body?.error === 'string' && body.error) return body.error;
    if (typeof body?.message === 'string' && body.message) return body.message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
