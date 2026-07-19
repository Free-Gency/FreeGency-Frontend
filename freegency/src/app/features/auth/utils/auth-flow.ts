export type AuthFlowStep =
  | 'check-email'
  | 'verify-code'
  | 'create-new-password'
  | 'reset-confirmed'
  | 'registration-success';

const FLOW_KEY = 'freegency.auth.flow';

interface AuthFlowState {
  step: AuthFlowStep;
  email?: string;
  grantedAt: number;
}

/** Call right before navigating to a gated auth step. */
export function grantAuthFlow(step: AuthFlowStep, email?: string): void {
  const state: AuthFlowState = {
    step,
    email: email?.trim() || undefined,
    grantedAt: Date.now(),
  };
  sessionStorage.setItem(FLOW_KEY, JSON.stringify(state));
}

export function clearAuthFlow(): void {
  sessionStorage.removeItem(FLOW_KEY);
}

export function readAuthFlow(): AuthFlowState | null {
  const raw = sessionStorage.getItem(FLOW_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthFlowState;
    if (!parsed?.step) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True when this step was granted (optionally matching email). */
export function hasAuthFlowAccess(step: AuthFlowStep, email?: string | null): boolean {
  const state = readAuthFlow();
  if (!state || state.step !== step) return false;

  if (email != null && email !== '') {
    return (state.email ?? '').toLowerCase() === email.trim().toLowerCase();
  }

  return true;
}
