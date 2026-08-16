import { Routes } from '@angular/router';
import { Setting } from './features/setting/setting';
import { authGuard } from './core/auth/auth.guard';
import { clientModeGuard, developerModeGuard } from './core/auth/profile-mode.guard';
import { ChatComponent } from './features/chat/chat.component';

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
    path: 'client/hire-talent',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/hire-talent/hire-talent.component').then(
        (m) => m.HireTalentComponent,
      ),
  },
  {
    path: 'client/manage-work',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/manage-work/manage-work.component').then(
        (m) => m.ManageWorkComponent,
      ),
  },
  {
    path: 'client/reports/hiring-agent/:runId',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/hiring-agent-report/hiring-agent-report.component').then(
        (m) => m.HiringAgentReportComponent,
      ),
  },
  {
    path: 'client/reports',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/client-reports/client-reports.component').then(
        (m) => m.ClientReportsComponent,
      ),
  },
  { path: 'chat', component: ChatComponent },
  {
    path: 'client/messages',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/client-messages/client-messages.component').then(
        (m) => m.ClientMessagesComponent,
      ),
  },
  {
    path: 'client/inspiration/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/client/pages/portfolio-project-details/portfolio-project-details.component').then(
        (m) => m.PortfolioProjectDetailsComponent,
      ),
  },
  {
    path: 'client/teams/:teamId',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/team-detail/team-detail.component').then(
        (m) => m.TeamDetailComponent,
      ),
  },
  {
    path: 'client/developers/:userId',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/freelancer/pages/freelancer-portfolio/freelancer-portfolio.component').then(
        (m) => m.FreelancerPortfolioComponent,
      ),
  },
  {
    path: 'client/talent/:kind/:id',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/client-talent-profile/client-talent-profile.component').then(
        (m) => m.ClientTalentProfileComponent,
      ),
  },
  {
    path: 'developer/me/portfolio',
    canActivate: [authGuard, developerModeGuard],
    data: { me: true },
    loadComponent: () =>
      import('./features/freelancer/pages/freelancer-portfolio/freelancer-portfolio.component').then(
        (m) => m.FreelancerPortfolioComponent,
      ),
  },
  {
    path: 'developer/portfolio/new',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/portfolio-case-study-wizard/portfolio-case-study-wizard.component').then(
        (m) => m.PortfolioCaseStudyWizardComponent,
      ),
  },
  {
    path: 'developer/portfolio/:projectId/edit',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/portfolio-case-study-wizard/portfolio-case-study-wizard.component').then(
        (m) => m.PortfolioCaseStudyWizardComponent,
      ),
  },
  {
    path: 'developer/portfolio/:id',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/client/pages/portfolio-project-details/portfolio-project-details.component').then(
        (m) => m.PortfolioProjectDetailsComponent,
      ),
  },
  {
    path: 'client/create-project',
    canActivate: [authGuard, clientModeGuard],
    loadComponent: () =>
      import('./features/client/pages/client-create-project-layout/client-create-project-layout.component').then(
        (m) => m.ClientCreateProjectLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/client/pages/client-create-project-choice/client-create-project-choice.component').then(
            (m) => m.ClientCreateProjectChoiceComponent,
          ),
      },
      {
        path: 'with-ai',
        loadComponent: () =>
          import('./features/auth/components/client-create-project-with-ai/client-create-project-with-ai.component').then(
            (m) => m.ClientCreateProjectWithAiComponent,
          ),
      },
      {
        path: 'with-ai/scope',
        loadComponent: () =>
          import('./features/auth/components/client-project-scope/client-project-scope.component').then(
            (m) => m.ClientProjectScopeComponent,
          ),
      },
      {
        path: 'with-ai/overview',
        loadComponent: () =>
          import('./features/auth/components/client-project-overview/client-project-overview.component').then(
            (m) => m.ClientProjectOverviewComponent,
          ),
      },
      {
        path: 'manual',
        loadComponent: () =>
          import('./features/auth/components/client-create-project-manual/client-create-project-manual.component').then(
            (m) => m.ClientCreateProjectManualComponent,
          ),
      },
      {
        path: 'manual/taxonomy',
        loadComponent: () =>
          import('./features/auth/components/client-create-project-manual-taxonomy/client-create-project-manual-taxonomy.component').then(
            (m) => m.ClientCreateProjectManualTaxonomyComponent,
          ),
      },
      {
        path: 'manual/scope',
        loadComponent: () =>
          import('./features/auth/components/client-project-scope/client-project-scope.component').then(
            (m) => m.ClientProjectScopeComponent,
          ),
      },
      {
        path: 'manual/overview',
        loadComponent: () =>
          import('./features/auth/components/client-project-overview/client-project-overview.component').then(
            (m) => m.ClientProjectOverviewComponent,
          ),
      },
    ],
  },
  {
    path: 'developer/home',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/freelancer/pages/freelancer-home/freelancer-home.component').then(
        (m) => m.FreelancerHomeComponent,
      ),
  },
  {
    path: 'developer/apply/:id',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/freelancer/apply-proposal.component/apply-proposal.component.component').then(
        (m) => m.ApplyProposalModalComponent,
      ),
  },
  { path: 'developer/explore', redirectTo: 'developer/teams', pathMatch: 'full' },
  {
    path: 'developer/manage-work',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/developer-manage-work/developer-manage-work.component').then(
        (m) => m.DeveloperManageWorkComponent,
      ),
  },
  {
    path: 'developer/teams/create',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/create-team-wizard/create-team-wizard.component').then(
        (m) => m.CreateTeamWizardComponent,
      ),
  },
  {
    path: 'developer/teams',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/developer-teams/developer-teams.component').then(
        (m) => m.DeveloperTeamsComponent,
      ),
  },
  {
    path: 'developer/teams/:teamId/portfolio/new',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/portfolio-case-study-wizard/portfolio-case-study-wizard.component').then(
        (m) => m.PortfolioCaseStudyWizardComponent,
      ),
  },
  {
    path: 'developer/teams/:teamId/portfolio/:projectId/edit',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/portfolio-case-study-wizard/portfolio-case-study-wizard.component').then(
        (m) => m.PortfolioCaseStudyWizardComponent,
      ),
  },
  {
    path: 'developer/teams/:teamId/projects/:projectId',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/team-project-workspace/team-project-workspace.component').then(
        (m) => m.TeamProjectWorkspaceComponent,
      ),
  },
  {
    path: 'developer/teams/:teamId',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/developer/pages/team-detail/team-detail.component').then(
        (m) => m.TeamDetailComponent,
      ),
  },
  { path: 'developer/my-teams', redirectTo: 'developer/teams', pathMatch: 'full' },
  {
    path: 'developer/my-teams/:teamId',
    redirectTo: 'developer/teams/:teamId',
    pathMatch: 'full',
  },
  {
    path: 'developer/jobs',
    canActivate: [authGuard, developerModeGuard],
    data: {
      title: 'Jobs',
      description: 'Browse open jobs and apply to projects that match your skills.',
    },
    loadComponent: () =>
      import('./features/developer/pages/developer-placeholder/developer-placeholder.component').then(
        (m) => m.DeveloperPlaceholderComponent,
      ),
  },
  {
    path: 'developer/messages',
    canActivate: [authGuard, developerModeGuard],
    data: {
      title: 'Messages',
      description: 'Chat with clients and teammates about proposals and projects.',
    },
    loadComponent: () =>
      import('./features/developer/pages/developer-messages/developer-messages.component').then(
        (m) => m.DeveloperMessagesComponent,
      ),
  },
  {
    path: 'freelancer/portfolio',
    canActivate: [authGuard, developerModeGuard],
    data: {
      title: 'Portfolio',
      description: 'View and manage your portfolio.',
    },
    loadComponent: () =>
      import('./features/freelancer/pages/freelancer-portfolio/freelancer-portfolio.component').then(
        (m) => m.FreelancerPortfolioComponent,
      ),
  },
  {
    path: 'freelancer/portfolio/:id',
    redirectTo: 'developer/portfolio/:id',
    pathMatch: 'full',
  },
  {
    path: '',
    loadChildren: () => import('./features/landing/landing.routes').then((m) => m.landingRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/setting/setting.routes').then((m) => m.settingRoutes),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadChildren: () => import('./features/project/project.routes').then((m) => m.projectRoutes),
  },
  { path: 'onboarding', redirectTo: 'auth/onboarding', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'auth/sign-up', pathMatch: 'full' },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'demo/proposal-flow',
    data: { demoFile: 'proposal-milestone-flow.html' },
    loadComponent: () =>
      import('./features/demo/static-demo-redirect').then((m) => m.StaticDemoRedirect),
  },
  {
    path: 'developer/developers/:userId',
    canActivate: [authGuard, developerModeGuard],
    loadComponent: () =>
      import('./features/freelancer/pages/freelancer-portfolio/freelancer-portfolio.component').then(
        (m) => m.FreelancerPortfolioComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
