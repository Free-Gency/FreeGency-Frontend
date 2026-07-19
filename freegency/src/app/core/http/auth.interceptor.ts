import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const auth = inject(AuthService);
  const isAuthApi = req.url.includes('/Auth');

  const accessToken = tokens.getAccessToken();
  const authReq =
    accessToken && !isAuthApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      // Don't try refresh on public auth calls (e.g. wrong password → 401).
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthApi) {
        return throwError(() => error);
      }

      if (!tokens.getRefreshToken()) {
        auth.clearSession();
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((newToken) =>
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            }),
          ),
        ),
      );
    }),
  );
};
