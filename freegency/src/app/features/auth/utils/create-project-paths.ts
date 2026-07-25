import { Router } from '@angular/router';
import { CLIENT_ONBOARDING_PATH } from '../../../core/auth/auth.models';

/** In-app create-project entry (client navbar). */
export const CLIENT_CREATE_PROJECT_PATH = '/client/create-project';

/** Onboarding create-project entry (onboarding header). */
export const ONBOARDING_CREATE_PROJECT_PATH = `${CLIENT_ONBOARDING_PATH}/create-project`;

export function createProjectBasePath(router: Router): string {
  return router.url.includes(CLIENT_CREATE_PROJECT_PATH)
    ? CLIENT_CREATE_PROJECT_PATH
    : ONBOARDING_CREATE_PROJECT_PATH;
}

export function isOnboardingCreateFlow(router: Router): boolean {
  return router.url.includes(CLIENT_ONBOARDING_PATH);
}
