import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

function permissionMatch(
  codes: ReadonlySet<string>,
  namespaces: string[] | undefined,
  anyPerms: string[] | undefined,
): boolean {
  let ok = false;
  if (namespaces?.length) {
    ok = namespaces.some((ns) => {
      const prefix = `${ns}.`;
      for (const c of codes) {
        if (c === ns || c.startsWith(prefix)) {
          return true;
        }
      }
      return false;
    });
  }
  if (!ok && anyPerms?.length) {
    ok = anyPerms.some((p) => codes.has(p));
  }
  return ok;
}

/**
 * Activa la ruta si el usuario tiene al menos un permiso del perfil que encaje con la configuración.
 *
 * `data.permissionNamespaces`: p. ej. `['users']` → cualquier código `users.*`
 * `data.anyPermissions`: códigos exactos; basta con coincidir uno.
 */
export const permissionsGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);
  const namespaces = route.data['permissionNamespaces'] as string[] | undefined;
  const anyPerms = route.data['anyPermissions'] as string[] | undefined;

  if (!namespaces?.length && !anyPerms?.length) {
    return true;
  }

  const decide = (codes: ReadonlySet<string>) =>
    permissionMatch(codes, namespaces, anyPerms)
      ? true
      : router.createUrlTree(['/app/dashboard']);

  const cached = auth.permissionCodes();
  if (cached.size > 0) {
    return decide(cached);
  }

  return http.get<{ code: string }[]>(`${environment.apiUrl}/users/me/permissions`).pipe(
    map((rows) => {
      auth.syncPermissionsFromResponse(rows);
      return decide(new Set(rows.map((r) => r.code)));
    }),
    catchError(() => of(router.createUrlTree(['/app/dashboard']))),
  );
};
