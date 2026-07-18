import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  { path: '', redirectTo: 'auth/onboarding', pathMatch: 'full' },
  { path: 'onboarding', redirectTo: 'auth/onboarding', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'auth/sign-up', pathMatch: 'full' },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
];
