/** Servidor de producción (mismo host que `environment.prod.ts`). */
const host = '127.0.0.1';
/** Solo si el API corre en tu PC: `const host = window.location.hostname;` */
const apiPort = 8000;
const httpOrigin = `http://${host}:${apiPort}`;

export const environment = {
  production: false,
  apiUrl: `${httpOrigin}/api/v1`,
  /** WebSocket autenticado (`?token=` JWT access). Debe coincidir con el host/puerto del API. */
  wsRealtimeUrl: `ws://${host}:${apiPort}/api/v1/realtime/ws`,
};
