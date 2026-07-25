import { Routes } from '@angular/router';
import { Setting } from './setting';
import { Account } from './account/account';
import { Notification } from './notification/notification';
import { Payment } from './payment/payment';
import { Privacy } from './privacy/privacy';
import { Verification } from './verification/verification';
import { Integrations } from './integrations/integrations';
import { Dangerzone } from './dangerzone/dangerzone';
import { Security } from './security/security';

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
     
        { path: 'security', component: Security },
        { path: 'notifications', component: Notification },
        { path: 'payments', component: Payment },
        { path: 'privacy', component: Privacy },
        { path: 'verification', component: Verification },
        { path: 'integrations', component: Integrations },
        { path: 'danger-zone', component: Dangerzone },
    ],
  },
];