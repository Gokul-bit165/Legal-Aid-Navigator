import { apiClient } from './api';

export interface AdminStats {
  total: number;
  confirmed: number;
  in_progress: number;
  needs_attention: number;
  urgent: number;
}

export interface AdminRow {
  id: string;
  request_id: string;
  applicant_name: string;
  legal_issue: string;
  location: string;
  status: string;
  is_urgent: boolean;
  fee_detected: boolean;
  submitted_at: string;
}

export interface AdminList {
  items: AdminRow[];
  total: number;
  page: number;
  page_size: number;
  issue_types: string[];
  statuses: string[];
}

export interface AdminFilters {
  search?: string;
  status?: string;
  issue?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface AdminSubtask { id: string; label: string; description?: string; status: string; completed_at?: string }
export interface AdminStage {
  stage_number: number;
  name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  subtasks: AdminSubtask[];
}

export interface AdminDetail {
  id: string;
  request_id: string;
  status: string;
  category: string;
  assignable_statuses: string[];
  created_at: string;
  updated_at: string;
  current_stage: number;
  stages: AdminStage[];
  booking_confirmation: null | {
    confirmation_number: string; authority_name: string; date: string; time_slot: string;
    location: string; mode: string; notes?: string;
  };
  applicant: { name: string; mobile: string; email: string; preferred_contact: string };
  request: {
    state: string; district: string; city: string; pin_code: string; issue_type: string;
    description: string; court_case_in_progress: string; court_deadline: string;
    eligibility_category: string; eligibility_details: string; supporting_document: string;
  };
  appointment: { preferred_date: string; preferred_time_slot: string; mode: string; alt_date: string; alt_time_slot: string };
  service: { id: string; name: string; match_status: string; review_reference: string };
  flags: { is_urgent: boolean; urgent_reason: string; fee_detected: boolean; fee_details: string };
  notes: string;
  additional_notes: string;
  audit: { actor: string; action: string; detail: string; at: string }[];
}

export interface AdminUpdate {
  admin_status?: string | null;
  admin_notes?: string;
  full_name?: string;
  mobile_number?: string;
  email?: string;
  fee_detected?: boolean;
  fee_details?: string;
  is_urgent?: boolean;
}

export const adminApi = {
  stats: async (f: Pick<AdminFilters, 'date_from' | 'date_to'>) =>
    (await apiClient.get<AdminStats>('/api/v1/admin/stats', { params: f })).data,
  list: async (f: AdminFilters) =>
    (await apiClient.get<AdminList>('/api/v1/admin/requests', { params: f })).data,
  detail: async (id: string) =>
    (await apiClient.get<AdminDetail>(`/api/v1/admin/requests/${id}`)).data,
  update: async (id: string, body: AdminUpdate) =>
    (await apiClient.patch<AdminDetail>(`/api/v1/admin/requests/${id}`, body)).data,
  users: async () =>
    (await apiClient.get<{ items: { id: string; username: string; email: string; full_name: string; role: string; created_at: string; applications: number }[] }>('/api/v1/admin/users')).data.items,
  appointments: async () =>
    (await apiClient.get<{ items: { id: string; request_id: string; applicant_name: string; date: string; time_slot: string; mode: string; location: string; status: string; is_urgent: boolean }[] }>('/api/v1/admin/appointments')).data.items,
  reports: async () =>
    (await apiClient.get<{
      total: number; by_status: Record<string, number>; by_issue: Record<string, number>;
      by_district: Record<string, number>; urgent: number; fee_stopped: number; unverified_service: number;
    }>('/api/v1/admin/reports')).data,
};

export function adminErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { response?: { data?: { detail?: unknown }; status?: number } };
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (e?.response?.status === 403) return 'You do not have administrator access.';
  if (e?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  return fallback;
}
