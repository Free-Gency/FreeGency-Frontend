import { Routes } from '@angular/router';
import { authFlowGuard } from './auth-flow.guard';

export const authRoutes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'client-onboarding',
    loadComponent: () =>
      import('./pages/client-onboarding/client-onboarding-layout.component').then(
        (m) => m.ClientOnboardingLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/client-onboarding-profile/client-onboarding-profile.component').then(
            (m) => m.ClientOnboardingProfileComponent,
          ),
        data: { step: 1 },
      },
      {
        path: 'interests',
        loadComponent: () =>
          import('./components/client-onboarding-interests/client-onboarding-interests.component').then(
            (m) => m.ClientOnboardingInterestsComponent,
          ),
        data: { step: 2 },
      },
      {
        path: 'create-project',
        loadComponent: () =>
          import('./components/client-onboarding-create-project/client-onboarding-create-project.component').then(
            (m) => m.ClientOnboardingCreateProjectComponent,
          ),
        data: { step: 3, center: false, appHeader: true },
      },
      {
        path: 'complete',
        loadComponent: () =>
          import('./components/client-onboarding-complete/client-onboarding-complete.component').then(
            (m) => m.ClientOnboardingCompleteComponent,
          ),
        data: { step: 3, filled: true },
      },
    ],
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'verify-code',
    loadComponent: () =>
      import('./pages/verify-code/verify-code.component').then((m) => m.VerifyCodeComponent),
    canActivate: [authFlowGuard('verify-code', { requireEmail: true })],
  },
  {
    path: 'create-new-password',
    loadComponent: () =>
      import('./pages/create-new-password/create-new-password.component').then(
        (m) => m.CreateNewPasswordComponent,
      ),
    canActivate: [authFlowGuard('create-new-password', { requireEmail: true })],
  },
  {
    path: 'reset-confirmed',
    loadComponent: () =>
      import('./pages/reset-confirmed/reset-confirmed.component').then(
        (m) => m.ResetConfirmedComponent,
      ),
    canActivate: [authFlowGuard('reset-confirmed')],
  },
  {
    path: 'check-email',
    loadComponent: () =>
      import('./pages/check-email/check-email.component').then((m) => m.CheckEmailComponent),
    canActivate: [authFlowGuard('check-email', { requireEmail: true })],
  },
  {
    path: 'confirm-email',
    loadComponent: () =>
      import('./pages/confirm-email/confirm-email.component').then((m) => m.ConfirmEmailComponent),
  },
  {
    path: 'google/callback',
    loadComponent: () =>
      import('./pages/google-callback/google-callback.component').then(
        (m) => m.GoogleCallbackComponent,
      ),
  },
  {
    path: 'registration-success',
    loadComponent: () =>
      import('./pages/registration-success/registration-success.component').then(
        (m) => m.RegistrationSuccessComponent,
      ),
    canActivate: [authFlowGuard('registration-success')],
  },
  { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
];
