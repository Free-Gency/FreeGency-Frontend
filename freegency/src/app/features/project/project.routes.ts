import { Routes } from '@angular/router';

export const projectRoutes: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/project-details/project-details.component').then(
        (m) => m.ProjectDetailsComponent,
      ),
  },
];