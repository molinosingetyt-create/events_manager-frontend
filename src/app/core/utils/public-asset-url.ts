import { environment } from '../../../environments/environment';

/** URL absoluta para rutas servidas por el API (`/uploads/...`). */
export function publicAssetUrl(path: string | null | undefined): string {
  if (path == null || path === '') {
    return '';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  let base: string;
  if (environment.apiUrl.startsWith('http')) {
    base = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  } else {
    base = typeof window !== 'undefined' ? window.location.origin : '';
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
