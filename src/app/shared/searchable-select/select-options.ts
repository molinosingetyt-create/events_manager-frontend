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
  { value: 'incapacity', label: 'Incapacidad' },
  { value: 'note', label: 'Nota' },
];

export const INCAPACITY_ADMIN_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
];
