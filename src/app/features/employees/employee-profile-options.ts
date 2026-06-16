import type { SearchableOption } from '../../shared/searchable-select/searchable-select.component';

export const DOCUMENT_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'CC', label: 'Cédula de ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de extranjería (CE)' },
  { value: 'PA', label: 'Pasaporte (PA)' },
  { value: 'TI', label: 'Tarjeta de identidad (TI)' },
  { value: 'NIT', label: 'NIT' },
];

export const GENDER_OPTIONS: SearchableOption<string>[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

export const MARITAL_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'union_libre', label: 'Unión libre' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
];

export const LINKAGE_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'direct', label: 'Empleado directo' },
  { value: 'temp_agency', label: 'Trabajador en misión (EST)' },
];

export const WORK_SITE_OPTIONS: SearchableOption<string>[] = [
  { value: 'Barranquilla', label: 'Barranquilla' },
  { value: 'Bucaramanga', label: 'Bucaramanga' },
  { value: 'Medellín', label: 'Medellín' },
  { value: 'Bogotá', label: 'Bogotá' },
];

export const HIERARCHICAL_LEVEL_OPTIONS: SearchableOption<string>[] = [
  { value: 'operario', label: 'Operario' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'jefe', label: 'Jefe' },
  { value: 'director', label: 'Director' },
  { value: 'gerencia', label: 'Gerencia' },
];

export const CONTRACT_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'fijo', label: 'Término fijo' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'obra_labor', label: 'Obra o labor' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
];

export const WORK_MODALITY_OPTIONS: SearchableOption<string>[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const COLLABORATOR_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'incapacidad', label: 'Incapacidad' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'retirado', label: 'Retirado' },
];

export const BANK_ACCOUNT_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'ahorros', label: 'Ahorros' },
  { value: 'corriente', label: 'Corriente' },
];

export const DOCUMENT_KIND_OPTIONS: SearchableOption<string>[] = [
  { value: 'cedula', label: 'Fotocopia cédula' },
  { value: 'hoja_vida', label: 'Hoja de vida' },
  { value: 'soporte_academico', label: 'Soporte académico' },
  { value: 'certificacion_laboral', label: 'Certificación laboral' },
  { value: 'examen_ingreso', label: 'Examen médico de ingreso' },
  { value: 'contrato', label: 'Contrato de trabajo firmado' },
  { value: 'acta_induccion', label: 'Acta de inducción' },
  { value: 'confidencialidad', label: 'Acuerdo de confidencialidad' },
  { value: 'dotacion_epp', label: 'Acta entrega dotación / EPP' },
  { value: 'rut', label: 'RUT' },
  { value: 'certificacion_bancaria', label: 'Certificación bancaria' },
  { value: 'otro', label: 'Otro documento' },
];

export const EDUCATION_LEVEL_OPTIONS: SearchableOption<string>[] = [
  { value: 'primaria', label: 'Primaria' },
  { value: 'bachillerato', label: 'Bachillerato' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'tecnologo', label: 'Tecnólogo' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'especializacion', label: 'Especialización' },
  { value: 'maestria', label: 'Maestría' },
  { value: 'doctorado', label: 'Doctorado' },
];

export const EDUCATION_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'culminado', label: 'Culminado' },
  { value: 'en_curso', label: 'En curso' },
];

export const TRAINING_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'induccion', label: 'Inducción' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'soft_skills', label: 'Soft skills' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'normativa', label: 'Normativa' },
  { value: 'otro', label: 'Otro' },
];

export const LANGUAGE_LEVEL_OPTIONS: SearchableOption<string>[] = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'nativo', label: 'Nativo' },
];

export const SOFTWARE_PROFICIENCY_OPTIONS: SearchableOption<string>[] = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export const WORK_SST_CERT_OPTIONS: SearchableOption<string>[] = [
  { value: 'altura', label: 'Trabajo en alturas' },
  { value: 'espacios_confinados', label: 'Espacios confinados' },
  { value: 'cargas', label: 'Manejo de cargas' },
  { value: 'electricos', label: 'Riesgo eléctrico' },
  { value: 'quimicos', label: 'Químicos' },
  { value: 'primeros_auxilios', label: 'Primeros auxilios' },
  { value: 'otro', label: 'Otro' },
];

export const INCAPACITY_ORIGIN_OPTIONS: SearchableOption<string>[] = [
  { value: 'comun', label: 'Común' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'otro', label: 'Otro' },
];

export const DISCIPLINARY_ACTION_OPTIONS: SearchableOption<string>[] = [
  { value: 'llamado_atencion', label: 'Llamado de atención' },
  { value: 'acta_compromiso', label: 'Acta de compromiso' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'otro', label: 'Otro' },
];

export const ABSENCE_TYPE_OPTIONS: SearchableOption<string>[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'ausencia', label: 'Ausencia' },
  { value: 'otro', label: 'Otro' },
];

export const DOCUMENT_STATUS_OPTIONS: SearchableOption<string>[] = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'pendiente', label: 'Pendiente' },
];
