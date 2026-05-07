function wsRealtimeUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/v1/realtime/ws`;
}

export const environment = {
  production: true,
  apiUrl: '/api/v1',
  get wsRealtimeUrl(): string {
    return wsRealtimeUrl();
  },
};
