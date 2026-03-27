/** Etiquetas solo para la UI; los valores del API siguen en inglés / snake_case. */

export const LABELS = {
  role: {
    ADMIN: 'Administrador',
    LEADER: 'Líder',
    HR: 'Recursos humanos',
    MANAGEMENT: 'Gerencia',
  },
  entityStatus: {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  },
  incapacityType: {
    incapacity: 'Incapacidad',
    note: 'Nota',
  },
  overtimeHistoryAction: {
    created: 'Solicitud creada',
    updated: 'Solicitud actualizada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  },
} as const;

export type LabelKind = keyof typeof LABELS;
