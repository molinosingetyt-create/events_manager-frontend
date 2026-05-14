const host = '44.197.169.240';
const apiPort = 8000;
const httpOrigin = `http://${host}:${apiPort}`;

export const environment = {
  production: false,
  apiUrl: `${httpOrigin}/api/v1`,
  /** WebSocket autenticado (`?token=` JWT access). Debe coincidir con el host/puerto del API. */
  wsRealtimeUrl: `ws://${host}:${apiPort}/api/v1/realtime/ws`,
};
