/** Decodifica el payload de un JWT (sin verificar firma). Solo para leer `exp` en cliente. */
export function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) {
      return null;
    }
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}
