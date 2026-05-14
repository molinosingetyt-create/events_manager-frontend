/** Host del API. Desarrollo contra servidor remoto: IP fija. Solo local (mismo host que el API): `window.location.hostname`. */
const host = '44.197.169.240';
// const host = window.location.hostname;
const apiPort = 8000;
const httpOrigin = `http://${host}:${apiPort}`;

export const environment = {
  production: false,
  apiUrl: `${httpOrigin}/api/v1`,
  /** WebSocket autenticado (`?token=` JWT access). Debe coincidir con el host/puerto del API. */
  wsRealtimeUrl: `ws://${host}:${apiPort}/api/v1/realtime/ws`,
};
