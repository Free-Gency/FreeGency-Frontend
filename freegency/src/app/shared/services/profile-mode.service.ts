import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import type { UserMode } from '../../core/auth/auth.models';
import {
  CLIENT_HOME_PATH,
  CLIENT_ONBOARDING_PATH,
  DEVELOPER_DASHBOARD_PATH,
  DEVELOPER_ONBOARDING_PATH,
  DEVELOPER_SETUP_PENDING_KEY,
} from '../../core/auth/auth.models';
import { ToastService } from '../components/toast/toast.service';

export interface ProfileModes {
  activeProfileMode: UserMode | string;
  hasClientProfile: boolean;
  hasDeveloperProfile: boolean;
  activeProfileId?: string | null;
}

export interface SwitchProfileResult {
  activeProfileMode: UserMode | string;
  profileId?: string | null;
  hasClientProfile: boolean;
  hasDeveloperProfile: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileModeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getModes(): Observable<ProfileModes> {
    return this.http.get<unknown>(`${this.baseUrl}/modes`).pipe(
      map((raw) => this.normalizeModes(raw)),
      catchError((err: unknown) => {
        const sessionMode = this.auth.session()?.activeProfileMode;
        if (sessionMode === 'Client' || sessionMode === 'Developer') {
          return of({
            activeProfileMode: sessionMode,
            hasClientProfile: sessionMode === 'Client',
            hasDeveloperProfile: sessionMode === 'Developer',
            activeProfileId: this.auth.session()?.profileId ?? null,
          });
        }
        return throwError(() => err);
      }),
    );
  }

  createClientProfile(): Observable<void> {
    return this.http.post(`${this.baseUrl}/client`, {}).pipe(map(() => undefined));
  }

  createDeveloperProfile(): Observable<void> {
    return this.http.post(`${this.baseUrl}/developer`, {}).pipe(map(() => undefined));
  }

  /** Create developer shell + open setup wizard (profile / expertise / skills). */
  startDeveloperSetup(): Observable<void> {
    return this.createDeveloperProfile().pipe(
      map(() => {
        this.markDeveloperSetupPending();
        void this.router.navigateByUrl(DEVELOPER_ONBOARDING_PATH);
      }),
    );
  }

  switchProfile(targetMode?: UserMode): Observable<SwitchProfileResult> {
    let params = new HttpParams();
    if (targetMode) params = params.set('targetMode', targetMode);

    return this.http
      .post<unknown>(`${this.baseUrl}/switch-profile`, {}, { params })
      .pipe(map((raw) => this.normalizeSwitch(raw)));
  }

  /**
   * Switch active mode. If the target profile is missing, create it first
   * (after user confirmation when `confirmCreate` is provided).
   */
  switchToMode(
    targetMode: UserMode,
    options?: { confirmCreate?: () => boolean; skipNavigate?: boolean },
  ): Observable<SwitchProfileResult> {
    const current = this.auth.session()?.activeProfileMode;
    if (current === targetMode) {
      return of({
        activeProfileMode: targetMode,
        profileId: this.auth.session()?.profileId ?? null,
        hasClientProfile: targetMode === 'Client',
        hasDeveloperProfile: targetMode === 'Developer',
      });
    }

    return this.getModes().pipe(
      switchMap((modes) => {
        const hasTarget =
          targetMode === 'Developer' ? modes.hasDeveloperProfile : modes.hasClientProfile;

        if (hasTarget) {
          return this.switchProfile(targetMode).pipe(
            map((result) => ({ result, justCreated: false })),
          );
        }

        const allowed =
          options?.confirmCreate?.() ??
          confirm(
            targetMode === 'Developer'
              ? 'You don’t have a Developer profile yet. Create one and switch now?'
              : 'You don’t have a Client profile yet. Create one and switch now?',
          );

        if (!allowed) {
          return throwError(() => new Error('cancelled'));
        }

        const create$ =
          targetMode === 'Developer'
            ? this.createDeveloperProfile()
            : this.createClientProfile();

        return create$.pipe(
          switchMap(() => this.switchProfile(targetMode)),
          map((result) => ({ result, justCreated: true })),
        );
      }),
      map(({ result, justCreated }) => {
        if (justCreated && targetMode === 'Developer') {
          this.markDeveloperSetupPending();
        }
        this.applySwitch(result, { skipNavigate: options?.skipNavigate });
        return result;
      }),
      catchError((err) => {
        if (err instanceof Error && err.message === 'cancelled') {
          return throwError(() => err);
        }
        const message = this.extractError(err);
        this.toast.error(message);
        return throwError(() => err);
      }),
    );
  }

  applySwitch(
    result: SwitchProfileResult,
    options?: { skipNavigate?: boolean },
  ): void {
    const mode =
      result.activeProfileMode === 'Client' || result.activeProfileMode === 'Developer'
        ? result.activeProfileMode
        : null;
    if (!mode) return;

    this.auth.patchActiveMode(mode, result.profileId ?? null);
    this.auth.setProfileImage(null);

    if (options?.skipNavigate) return;

    const path =
      mode === 'Client'
        ? this.auth.needsClientOnboarding()
          ? CLIENT_ONBOARDING_PATH
          : CLIENT_HOME_PATH
        : this.isDeveloperSetupPending()
          ? DEVELOPER_ONBOARDING_PATH
          : DEVELOPER_DASHBOARD_PATH;

    void this.router.navigateByUrl(path);
  }

  markDeveloperSetupPending(): void {
    try {
      sessionStorage.setItem(DEVELOPER_SETUP_PENDING_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  isDeveloperSetupPending(): boolean {
    try {
      return sessionStorage.getItem(DEVELOPER_SETUP_PENDING_KEY) === '1';
    } catch {
      return false;
    }
  }

  private normalizeModes(raw: unknown): ProfileModes {
    const r = (raw ?? {}) as Record<string, unknown>;
    const data =
      r['data'] && typeof r['data'] === 'object'
        ? (r['data'] as Record<string, unknown>)
        : r;

    const modeRaw = String(data['activeProfileMode'] ?? data['ActiveProfileMode'] ?? '');
    return {
      activeProfileMode: modeRaw,
      hasClientProfile: Boolean(data['hasClientProfile'] ?? data['HasClientProfile']),
      hasDeveloperProfile: Boolean(data['hasDeveloperProfile'] ?? data['HasDeveloperProfile']),
      activeProfileId: (data['activeProfileId'] ?? data['ActiveProfileId'] ?? null) as
        | string
        | null,
    };
  }

  private normalizeSwitch(raw: unknown): SwitchProfileResult {
    const r = (raw ?? {}) as Record<string, unknown>;
    const data =
      r['data'] && typeof r['data'] === 'object'
        ? (r['data'] as Record<string, unknown>)
        : r;

    return {
      activeProfileMode: String(data['activeProfileMode'] ?? data['ActiveProfileMode'] ?? ''),
      profileId: (data['profileId'] ?? data['ProfileId'] ?? null) as string | null,
      hasClientProfile: Boolean(data['hasClientProfile'] ?? data['HasClientProfile']),
      hasDeveloperProfile: Boolean(data['hasDeveloperProfile'] ?? data['HasDeveloperProfile']),
    };
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as
        | { title?: string; detail?: string; errors?: string[]; message?: string }
        | string
        | null;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') {
        if (body.detail) return body.detail;
        if (body.message) return body.message;
        if (body.title) return body.title;
        if (body.errors?.length) return body.errors[0];
      }
      if (err.status === 409) {
        return 'Create the other profile before switching modes.';
      }
    }
    return 'Could not switch profile mode. Try again.';
  }
}
