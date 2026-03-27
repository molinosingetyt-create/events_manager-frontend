import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let msg = err.error?.detail ?? err.message;
      if (Array.isArray(err.error?.detail)) {
        msg = err.error.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ');
      }
      if (typeof msg !== 'string') {
        msg = 'La solicitud ha fallado';
      }
      if (
        err.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        auth.logout();
        msg = 'Sesión caducada. Vuelve a iniciar sesión.';
      }
      snack.open(msg, 'Cerrar', { duration: 5000 });
      return throwError(() => err);
    }),
  );
};
