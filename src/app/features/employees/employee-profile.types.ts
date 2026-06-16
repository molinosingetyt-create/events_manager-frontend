export interface EmployeeProfileFull {
  employee: {
    id: number;
    name: string;
    identification_number: string;
    position: string;
    area_name: string;
    temporal_category_name?: string;
    leader_name: string | null;
    status: string;
    updated_at: string;
  };
  personal: Record<string, unknown>;
  labor: Record<string, unknown>;
  dependents: {
    id?: number;
    full_name: string;
    relationship?: string | null;
    birth_date?: string | null;
    schooling?: string | null;
  }[];
  documents: EmployeeDocumentRow[];
  education: EducationRow[];
  training: TrainingRow[];
  prior_jobs: PriorJobRow[];
  languages: LanguageRow[];
  software_skills: SoftwareSkillRow[];
  driving_licenses: DrivingLicenseRow[];
  work_sst_certs: WorkSstCertRow[];
  competency_evaluations: CompetencyEvalRow[];
  sst_profile: SstProfileData;
  sst_periodic_exams: SstPeriodicExamRow[];
  sst_incapacities: SstIncapacityRow[];
  sst_accidents: SstAccidentRow[];
  sst_ppe: SstPpeRow[];
  contract_history: ContractHistoryRow[];
  salary_history: SalaryHistoryRow[];
  performance_reviews: PerformanceReviewRow[];
  recognitions: RecognitionRow[];
  disciplinary_actions: DisciplinaryActionRow[];
  absence_records: AbsenceRecordRow[];
  custom_fields: CustomFieldRow[];
  payroll_summary: PayrollSummaryData | null;
  payroll_entries: PayrollEntryRow[];
  completeness_percent: number;
  can_edit: boolean;
  can_edit_documents: boolean;
  can_manage_custom_fields: boolean;
  can_edit_payroll: boolean;
}

export interface CustomFieldRow {
  field_def_id: number;
  field_key: string;
  label: string;
  field_type: string;
  section?: string | null;
  options: string[];
  is_required: boolean;
  value?: string | null;
}

export interface PayrollSummaryData {
  base_salary?: number | null;
  eps_name?: string | null;
  eps_affiliation_number?: string | null;
  pension_fund?: string | null;
  severance_fund?: string | null;
  family_compensation_box?: string | null;
  arl_name?: string | null;
  bank_name?: string | null;
  bank_account_type?: string | null;
  bank_account_number?: string | null;
  notes?: string | null;
}

export interface PayrollEntryRow {
  id: number;
  period_month: string;
  concept_type: string;
  description: string;
  amount?: number | null;
  reference_code?: string | null;
  notes?: string | null;
  source: string;
  created_by_name?: string | null;
}

export interface EmployeeDocumentRow {
  id: number;
  document_kind: string;
  document_kind_label: string;
  display_name: string;
  file_url: string;
  status: string;
  expires_at?: string | null;
  created_at: string;
  uploaded_by_name?: string | null;
}

export interface EducationRow {
  id: number;
  education_level?: string | null;
  institution?: string | null;
  program?: string | null;
  graduation_year?: number | null;
  status?: string | null;
  certificate_url?: string | null;
}

export interface TrainingRow {
  id: number;
  name: string;
  provider?: string | null;
  completed_at?: string | null;
  hours?: number | null;
  training_type?: string | null;
  certificate_url?: string | null;
}

export interface PriorJobRow {
  id: number;
  company_name: string;
  position?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_text?: string | null;
  economic_sector?: string | null;
  leave_reason?: string | null;
  reference_phone?: string | null;
}

export interface LanguageRow {
  id: number;
  language: string;
  level?: string | null;
}

export interface SoftwareSkillRow {
  id: number;
  name: string;
  proficiency?: string | null;
}

export interface DrivingLicenseRow {
  id: number;
  category: string;
  expires_at?: string | null;
}

export interface WorkSstCertRow {
  id: number;
  cert_type: string;
  issued_at?: string | null;
  expires_at?: string | null;
  certificate_url?: string | null;
}

export interface CompetencyEvalRow {
  id: number;
  period_label: string;
  rating?: string | null;
  evaluator_name?: string | null;
  notes?: string | null;
}

export interface SstProfileData {
  entry_exam_date?: string | null;
  entry_medical_concept?: string | null;
  entry_restrictions?: string | null;
  occupational_disease?: string | null;
  current_medical_restrictions?: string | null;
}

export interface SstPeriodicExamRow {
  id: number;
  exam_date?: string | null;
  result?: string | null;
  notes?: string | null;
}

export interface SstIncapacityRow {
  id: number;
  origin?: string | null;
  diagnosis?: string | null;
  days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface SstAccidentRow {
  id: number;
  occurred_at?: string | null;
  description?: string | null;
  lost_days?: number | null;
}

export interface SstPpeRow {
  id: number;
  item_name: string;
  delivered_at?: string | null;
  receipt_signed: boolean;
}

export interface ContractHistoryRow {
  id: number;
  effective_date?: string | null;
  contract_type?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface SalaryHistoryRow {
  id: number;
  effective_date?: string | null;
  previous_salary?: number | null;
  new_salary?: number | null;
  reason?: string | null;
}

export interface PerformanceReviewRow {
  id: number;
  period_label: string;
  rating?: string | null;
  evaluator_name?: string | null;
  notes?: string | null;
}

export interface RecognitionRow {
  id: number;
  title: string;
  recognized_at?: string | null;
  description?: string | null;
}

export interface DisciplinaryActionRow {
  id: number;
  action_type: string;
  occurred_at?: string | null;
  description?: string | null;
}

export interface AbsenceRecordRow {
  id: number;
  absence_type: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  notes?: string | null;
}
