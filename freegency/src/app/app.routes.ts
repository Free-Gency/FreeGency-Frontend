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
    path: 'client/inspiration/:id',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import(
        './features/client/pages/portfolio-project-details/portfolio-project-details.component'
      ).then((m) => m.PortfolioProjectDetailsComponent),
  },
  {
    path: 'client/create-project',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import(
        './features/client/pages/client-create-project-layout/client-create-project-layout.component'
      ).then((m) => m.ClientCreateProjectLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/client/pages/client-create-project-choice/client-create-project-choice.component'
          ).then((m) => m.ClientCreateProjectChoiceComponent),
      },
      {
        path: 'with-ai',
        loadComponent: () =>
          import(
            './features/auth/components/client-create-project-with-ai/client-create-project-with-ai.component'
          ).then((m) => m.ClientCreateProjectWithAiComponent),
      },
      {
        path: 'with-ai/scope',
        loadComponent: () =>
          import(
            './features/auth/components/client-project-scope/client-project-scope.component'
          ).then((m) => m.ClientProjectScopeComponent),
      },
      {
        path: 'with-ai/overview',
        loadComponent: () =>
          import(
            './features/auth/components/client-project-overview/client-project-overview.component'
          ).then((m) => m.ClientProjectOverviewComponent),
      },
      {
        path: 'manual',
        loadComponent: () =>
          import(
            './features/auth/components/client-create-project-manual/client-create-project-manual.component'
          ).then((m) => m.ClientCreateProjectManualComponent),
      },
      {
        path: 'manual/taxonomy',
        loadComponent: () =>
          import(
            './features/auth/components/client-create-project-manual-taxonomy/client-create-project-manual-taxonomy.component'
          ).then((m) => m.ClientCreateProjectManualTaxonomyComponent),
      },
      {
        path: 'manual/scope',
        loadComponent: () =>
          import(
            './features/auth/components/client-project-scope/client-project-scope.component'
          ).then((m) => m.ClientProjectScopeComponent),
      },
      {
        path: 'manual/overview',
        loadComponent: () =>
          import(
            './features/auth/components/client-project-overview/client-project-overview.component'
          ).then((m) => m.ClientProjectOverviewComponent),
      },
    ],
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
{
  path: 'projects',
  canActivate: [authGuard],
  loadChildren: () =>
    import('./features/project/project.routes').then((m) => m.projectRoutes),
},
  { path: 'onboarding', redirectTo: 'auth/onboarding', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'auth/sign-up', pathMatch: 'full' },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
