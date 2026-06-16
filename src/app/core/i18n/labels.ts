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
    general_illness: 'Enfermedad general',
    work_accident: 'Accidente de trabajo',
    maternity_leave: 'Licencia de maternidad',
    paternity_leave: 'Licencia de paternidad',
    bereavement_leave: 'Licencia de luto',
    /** Valores antiguos (histórico / Excel) */
    incapacity: 'Enfermedad general',
    note: 'Accidente de trabajo',
  },
  absenteeismClassification: {
    paid: 'Remunerado',
    unpaid: 'No remunerado',
  },
  longAbsenceDocumentKind: {
    historia_clinica: 'Historia clínica',
    incapacidad_eps: 'Incapacidad transcrita por EPS',
  },
  overtimeHistoryAction: {
    created: 'Solicitud creada',
    updated: 'Solicitud actualizada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  },
} as const;

export type LabelKind = keyof typeof LABELS;
