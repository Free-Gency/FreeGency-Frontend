import { Routes } from '@angular/router';
import { Setting } from './setting';
import { Account } from './account/account';
import { Notifications } from './notification/notification';
import { Payment } from './payment/payment';
import { Privacy } from './privacy/privacy';
import { Verification } from './verification/verification';
import { Integrations } from './integrations/integrations';
import { DangerZone } from '../setting/dangerzone/dangerzone';
import { SecurityComponent } from './security/security.component';
import { ProfileModePage } from './profile-mode/profile-mode';

export const settingRoutes: Routes = [
  {
    path: '',
    component: Setting,
    children: [
      {
        path: '',
        redirectTo: 'account',
        pathMatch: 'full',
      },
      {
        path: 'account',
        component: Account,
      },
      {
        path: 'profile-mode',
        component: ProfileModePage,
      },
      { path: 'security', component: SecurityComponent },
      { path: 'notifications', component: Notifications },
      { path: 'payments', component: Payment },
      { path: 'privacy', component: Privacy },
      { path: 'verification', component: Verification },
      { path: 'integrations', component: Integrations },
      { path: 'danger-zone', component: DangerZone },
    ],
  },
];
