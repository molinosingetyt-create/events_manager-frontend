/** Servidor de producción (EC2 / despliegue actual). */
const PROD_HOST = 'back-eventsmanager.mdalanieve.com';

function productionApiUrl(): string {
  if (typeof window === 'undefined') {
    return `https://${PROD_HOST}/api/v1`;
  }
  const { protocol, hostname, host, port } = window.location;
  if (hostname === PROD_HOST || hostname === 'localhost') {
    return `${protocol}//${host}/api/v1`;
  }
  return `https://${PROD_HOST}/api/v1`;
}

function productionWsUrl(): string {
  if (typeof window === 'undefined') {
    return `wss://${PROD_HOST}/api/v1/realtime/ws`;
  }
  const { protocol, hostname, host} = window.location;
  if (hostname === PROD_HOST || hostname === 'localhost') {
    const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${host}/api/v1/realtime/ws`;
  }
  return `wss://${PROD_HOST}/api/v1/realtime/ws`;
}

export const environment = {
  production: true,
  apiUrl: productionApiUrl(),
  wsRealtimeUrl: productionWsUrl(),
};
