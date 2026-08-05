import { HttpErrorResponse } from '@angular/common/http';

/** Parse ASP.NET ProblemDetails / FluentValidation error bodies into a user-facing message. */
export function extractApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && !(error instanceof HttpErrorResponse) && error.message.trim()) {
    return error.message.trim();
  }

  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = parseErrorBody(error.error);
  const fromBody = messageFromBody(body);
  if (fromBody) {
    return fromBody;
  }

  if (typeof error.error === 'string' && error.error.trim() && !looksLikeJson(error.error)) {
    return error.error.trim();
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check that the API is running.';
  }

  return fallback;
}

function parseErrorBody(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === 'string' && looksLikeJson(raw)) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function messageFromBody(body: Record<string, unknown> | null): string | null {
  if (!body) {
    return null;
  }

  const errors = body['errors'];

  if (Array.isArray(errors)) {
    const messages = errors.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    if (messages.length > 0) {
      return messages[messages.length - 1].trim();
    }
  }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const messages = Object.values(errors as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (messages.length > 0) {
      return messages[0].trim();
    }
  }

  const nestedError = body['error'];
  if (nestedError && typeof nestedError === 'object' && !Array.isArray(nestedError)) {
    const nestedMessage = (nestedError as Record<string, unknown>)['message'];
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  const message = body['message'];
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  const detail = body['detail'];
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  const title = body['title'];
  if (typeof title === 'string' && title.trim() && title !== 'One or more validation errors occurred.') {
    return title.trim();
  }

  return null;
}
