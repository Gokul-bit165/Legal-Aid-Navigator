// ── Workflow stage status values ───────────────────────────────────────────────
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'awaiting_approval';

// ── Sub-task inside a workflow stage ──────────────────────────────────────────
export interface SubTask {
  id: string;
  label: string;
  description?: string;
  status: StageStatus;
  completed_at?: string;   // ISO timestamp
  error?: string;
}

// ── One workflow stage ────────────────────────────────────────────────────────
export interface WorkflowStage {
  stage_number: number;        // 1–6
  name: string;
  status: StageStatus;
  started_at?: string;         // ISO timestamp
  completed_at?: string;
  error?: string;
  subtasks: SubTask[];
  result_json?: Record<string, unknown>;  // stage-specific payload
}

// ── Overall request status ────────────────────────────────────────────────────
export type RequestStatus = 'in_progress' | 'completed' | 'failed' | 'awaiting_approval';

// ── Request summary (from the sidebar) ───────────────────────────────────────
export interface RequestSummary {
  location: string;
  legal_issue: string;
  eligibility_category: string;
  name: string;
  mobile_number: string;
  email: string;
  preferred_date: string;
  preferred_time_slot: string;
  consultation_mode: string;
}

// ── Full API response from GET /api/v1/requests/:id/status ───────────────────
export interface LegalAidRequestStatus {
  id: string;
  request_id: string;          // display ID like LA-2025-00123
  status: RequestStatus;
  current_stage: number;       // 1–6
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
  stages: WorkflowStage[];
  summary: RequestSummary;
  // Stage 4 result – slots to show before booking approval
  available_slots?: AppointmentSlot[];
  // Stage 6 result – confirmed booking
  booking_confirmation?: BookingConfirmation;
}

export interface AppointmentSlot {
  id: string;
  date: string;
  time_slot: string;
  authority_name: string;
  location: string;
  mode: string;
}

export interface BookingConfirmation {
  confirmation_number: string;
  authority_name: string;
  date: string;
  time_slot: string;
  location: string;
  mode: string;
  notes?: string;
}
