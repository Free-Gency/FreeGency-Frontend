export const PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/;

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@#$%^&*!).';

export interface PasswordRule {
  label: string;
  met: boolean;
}

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: 'Be at least 8 characters long', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', met: /\d/.test(password) },
    { label: 'At least one special character (@#$%^&*!)', met: /[@#$%^&*!]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}
