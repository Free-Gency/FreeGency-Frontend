import { Routes } from '@angular/router';
import { Setting } from './features/setting/setting';

export const routes: Routes = [
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
];
