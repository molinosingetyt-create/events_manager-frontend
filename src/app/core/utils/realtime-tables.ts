/** Mensaje emitido por el backend vía WebSocket tras mutaciones. */
export interface DataChangedMessage {
  type: 'data_changed';
  tables: string[];
}

export function isDataChangedMessage(raw: unknown): raw is DataChangedMessage {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const o = raw as Record<string, unknown>;
  return o['type'] === 'data_changed' && Array.isArray(o['tables']);
}

/** ¿Debe esta pantalla refrescar su tabla ante el evento? */
export function realtimeAffectsTable(msg: DataChangedMessage, tableKey: string): boolean {
  return msg.tables.includes(tableKey);
}
