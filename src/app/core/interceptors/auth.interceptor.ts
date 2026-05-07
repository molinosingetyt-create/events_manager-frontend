import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { SessionActivityService } from '../services/session-activity.service';

/** Las respuestas API cuentan como actividad (procesos largos sin tocar el teclado). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const activity = inject(SessionActivityService);
  const token = localStorage.getItem('access_token');
  const isAuth = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
  if (token && !isAuth) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    tap({
      next: () => {
        if (token && !isAuth) {
          activity.recordActivity();
        }
      },
    }),
  );
};
