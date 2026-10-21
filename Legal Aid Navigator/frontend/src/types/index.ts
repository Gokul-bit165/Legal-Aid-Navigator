// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: 'applicant' | 'admin';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ── Step 1 – Location ─────────────────────────────────────────────────────────
export interface LocationFormData {
  country: string;
  state: string;
  district: string;
  city: string;
  pin_code: string;
}

// ── Step 2 – Legal Issue ──────────────────────────────────────────────────────
export interface LegalIssueFormData {
  issue_type: string;
  description: string;
  court_case_in_progress: 'yes' | 'no' | 'unsure' | '';
  court_deadline: string;
  urgency: 'normal' | 'urgent' | '';
}

// ── Step 3 – Eligibility ──────────────────────────────────────────────────────
export interface EligibilityFormData {
  eligibility_category: string;
  eligibility_details: string;
  supporting_document: 'yes' | 'no' | 'unsure' | '';
}

// ── Step 4 – Contact ──────────────────────────────────────────────────────────
export interface ContactFormData {
  full_name: string;
  mobile_number: string;
  email: string;
  preferred_contact: 'phone' | 'email' | 'sms' | '';
  consultation_mode: 'in_person' | 'phone' | 'video' | '';
}

// ── Step 5 – Appointment ──────────────────────────────────────────────────────
export interface AppointmentFormData {
  preferred_date: string;
  preferred_time_slot: string;
  consultation_mode: 'in_person' | 'phone' | 'video' | '';
  alt_date: string;
  alt_time_slot: string;
  additional_notes: string;
}

// ── Step 6 – Consent ──────────────────────────────────────────────────────────
export interface ConsentFormData {
  consent_use_of_info: boolean;
  consent_accuracy: boolean;
  consent_booking_approval: boolean;
}

// ── Combined form state ───────────────────────────────────────────────────────
export interface ApplicationFormState {
  location: LocationFormData;
  legal_issue: LegalIssueFormData;
  eligibility: EligibilityFormData;
  contact: ContactFormData;
  appointment: AppointmentFormData;
  consent: ConsentFormData;
  completedSteps: number[];
  currentStep: number;
}

export const EMPTY_FORM_STATE: ApplicationFormState = {
  location: { country: '', state: '', district: '', city: '', pin_code: '' },
  legal_issue: { issue_type: '', description: '', court_case_in_progress: '', court_deadline: '', urgency: '' },
  eligibility: { eligibility_category: '', eligibility_details: '', supporting_document: '' },
  contact: { full_name: '', mobile_number: '', email: '', preferred_contact: '', consultation_mode: '' },
  appointment: { preferred_date: '', preferred_time_slot: '', consultation_mode: '', alt_date: '', alt_time_slot: '', additional_notes: '' },
  consent: { consent_use_of_info: false, consent_accuracy: false, consent_booking_approval: false },
  completedSteps: [],
  currentStep: 1,
};
