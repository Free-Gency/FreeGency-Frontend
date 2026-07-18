import { Routes } from '@angular/router';
import { CheckEmailComponent } from './pages/check-email/check-email.component';
import { ConfirmEmailComponent } from './pages/confirm-email/confirm-email.component';
import { CreateNewPasswordComponent } from './pages/create-new-password/create-new-password.component';
import { LoginComponent } from './pages/login/login.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { RegistrationSuccessComponent } from './pages/registration-success/registration-success.component';
import { ResetConfirmedComponent } from './pages/reset-confirmed/reset-confirmed.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { VerifyCodeComponent } from './pages/verify-code/verify-code.component';

export const authRoutes: Routes = [
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-code', component: VerifyCodeComponent },
  { path: 'create-new-password', component: CreateNewPasswordComponent },
  { path: 'reset-confirmed', component: ResetConfirmedComponent },
  { path: 'check-email', component: CheckEmailComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },
  { path: 'registration-success', component: RegistrationSuccessComponent },
  { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
];
