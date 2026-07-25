import { Routes } from '@angular/router';
import { Setting } from './features/setting/setting';
import { authGuard } from './core/auth/auth.guard';
import {
  clientModeGuard,
  developerModeGuard,
} from './core/auth/profile-mode.guard';

export const routes: Routes = [
  {
    path: 'client/home',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/client-home/client-home.component').then(
        (m) => m.ClientHomeComponent,
      ),
  },
  {
    path: 'developer/dashboard',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import(
        './features/developer/pages/developer-dashboard/developer-dashboard.component'
      ).then((m) => m.DeveloperDashboardComponent),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then((m) => m.landingRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
 {
  path: 'settings',
  loadChildren: () =>
    import('./features/setting/setting.routes').then(m => m.settingRoutes),
},
  { path: 'onboarding', redirectTo: 'auth/onboarding', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'auth/sign-up', pathMatch: 'full' },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
