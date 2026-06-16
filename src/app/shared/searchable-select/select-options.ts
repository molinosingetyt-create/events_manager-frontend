import type { SearchableOption } from './searchable-select.component';

export const ROLE_OPTIONS: SearchableOption<string>[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'HR', label: 'Recursos humanos' },
  { value: 'MANAGEMENT', label: 'Gerencia' },
  { value: 'LEADER', label: 'Líder' },
];

export const ENTITY_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'pending', label: 'Pendiente' },
];

export const INCAPACITY_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'general_illness', label: 'Enfermedad general' },
  { value: 'work_accident', label: 'Accidente de trabajo' },
  { value: 'maternity_leave', label: 'Licencia de maternidad' },
  { value: 'paternity_leave', label: 'Licencia de paternidad' },
  { value: 'bereavement_leave', label: 'Licencia de luto' },
];

export const ABSENTEEISM_CLASSIFICATION_OPTIONS: SearchableOption<string>[] = [
  { value: 'paid', label: 'Remunerado' },
  { value: 'unpaid', label: 'No remunerado' },
];

export const INCAPACITY_ADMIN_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
];

/** Catálogo EPS / ARL (valor del API). */
export const EPS_ARL_KIND_OPTIONS: SearchableOption<string>[] = [
  { value: 'eps', label: 'EPS' },
  { value: 'arl', label: 'ARL' },
];

/** Estado para tablas de catálogo (solo activo / inactivo). */
export const CATALOG_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];
