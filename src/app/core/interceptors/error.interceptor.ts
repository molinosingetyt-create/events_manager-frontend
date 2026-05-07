import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionActivityService } from '../services/session-activity.service';

const AUTH_RETRY = 'X-Auth-Retry';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);
  const auth = inject(AuthService);
  const activity = inject(SessionActivityService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let msg = err.error?.detail ?? err.message;
      if (Array.isArray(err.error?.detail)) {
        msg = err.error.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ');
      }
      if (typeof msg !== 'string') {
        msg = 'La solicitud ha fallado';
      }

      const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
      const alreadyRetried = req.headers.get(AUTH_RETRY) === '1';

      if (
        err.status === 401 &&
        !isAuthUrl &&
        !alreadyRetried &&
        activity.isActiveForRefresh() &&
        localStorage.getItem('refresh_token')
      ) {
        return auth.refreshDeduped().pipe(
          switchMap(() => {
            const token = localStorage.getItem('access_token');
            const retry = req.clone({
              setHeaders: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                [AUTH_RETRY]: '1',
              },
            });
            return next(retry);
          }),
          catchError(() => {
            auth.logout();
            snack.open('Sesión caducada. Vuelve a iniciar sesión.', 'Cerrar', { duration: 5000 });
            return throwError(() => err);
          }),
        );
      }

      if (err.status === 401 && !isAuthUrl) {
        auth.logout();
        msg = 'Sesión caducada. Vuelve a iniciar sesión.';
      }
      snack.open(msg, 'Cerrar', { duration: 5000 });
      return throwError(() => err);
    }),
  );
};
