import axios from 'axios';
import { N8N_WEBHOOK_URL, LEGAL_AID_REQUEST_URL } from '../config';
import type { ApplicationFormState } from '../types';
import { buildN8nPayload, payloadDebugSummary } from '../utils/n8nPayload';
import { parseN8nResponse, type ParsedAgentResponse } from '../utils/n8nResponse';

export type N8nResponse = ParsedAgentResponse;
import type { LegalAidRequestStatus } from '../types/status';


const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage to every request if present
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('lan_auth');
    if (raw) {
      const { token } = JSON.parse(raw);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* noop */ }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: string; username: string; email: string; full_name?: string; role?: 'applicant' | 'admin'; created_at: string };
}

export async function registerUser(
  username: string, email: string, password: string
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/v1/auth/register', { username, email, password });
  return res.data;
}

export async function loginUser(
  username: string, password: string
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/v1/auth/login', { username, password });
  return res.data;
}

export async function getMe(): Promise<AuthResponse['user']> {
  const res = await apiClient.get<AuthResponse['user']>('/api/v1/auth/me');
  return res.data;
}

// ── Request creation ──────────────────────────────────────────────────────────

export interface CreateRequestPayload {
  form: ApplicationFormState;
}

export interface CreateRequestResponse {
  id: string;          // internal UUID
  request_id: string;  // display ID like LA-2025-00123
}

export async function createRequest(
  form: ApplicationFormState,
): Promise<CreateRequestResponse> {
  const res = await apiClient.post<CreateRequestResponse>('/api/v1/requests', { form });
  return res.data;
}

/** Turn any webhook failure into a message that is safe to show an applicant. */
export function describeWebhookError(err: unknown, action: string): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    if (import.meta.env.DEV) {
      console.warn(`[n8n] ${action} failed`, { status, code: err.code });
    }
    if (!err.response) {
      return err.code === 'ECONNABORTED'
        ? `The ${action} took too long. Please try again.`
        : `Could not reach the ${action} service. Check your connection and try again.`;
    }
    if (status === 400 && data && typeof data === 'object') {
      const errors = (data as { validation_errors?: unknown }).validation_errors;
      if (Array.isArray(errors) && errors.length) {
        return `Your request could not be submitted: ${errors.join('; ')}.`;
      }
    }
    if (status === 404) return `The ${action} service is not available right now. Please try again later.`;
    if (status && status >= 500) return `The ${action} service had a problem. Please try again in a moment.`;
    return `The ${action} could not be completed (error ${status}).`;
  }
  return err instanceof Error ? err.message : `The ${action} failed. Please try again.`;
}

/**
 * Workflow 1 — Legal Aid Recommendation.
 * Sends the completed form and returns validated recommendations. It never books anything.
 */
export async function submitToN8n(form: ApplicationFormState): Promise<N8nResponse> {
  const payload = buildN8nPayload(form);

  if (import.meta.env.DEV) {
    console.log('[n8n] Payload field summary (no applicant contact details):', payloadDebugSummary(payload));
  }

  let data: unknown;
  try {
    const res = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90_000,
    });
    data = res.data;
  } catch (err) {
    throw new Error(describeWebhookError(err, 'recommendation request'));
  }

  const parsed = parseN8nResponse(data);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.data;
}

// ── Service request submission (Workflow 2 – request review) ──────────────────

export interface ServiceRequestPayload {
  service_id: string;
  service_name: string;
  preferred_date: string;
  preferred_time: string;
  contact_preference: string;
}

export interface ServiceRequestResponse {
  success?: boolean;
  request_id?: string;
  status: string;
  duplicate?: boolean;
  service_match_status?: string;
  service_verification?: string;
  humanApprovalRequired: boolean;
  bookingConfirmed: boolean;
  message?: string;
}

/** Workflow 2 only accepts HH:MM; the form stores ranges like "10:00 - 11:00". */
export function toStartTime(slot: string): string {
  const m = slot.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/**
 * Workflow 2 — Legal Aid Request Review.
 * Saves the applicant's chosen service for human review. Success is reported only when the
 * workflow confirms the save with a request ID; booking is never treated as confirmed.
 */
export async function submitServiceRequest(
  payload: ServiceRequestPayload,
): Promise<ServiceRequestResponse> {
  let data: Partial<ServiceRequestResponse>;
  try {
    const res = await axios.post<Partial<ServiceRequestResponse>>(LEGAL_AID_REQUEST_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
    data = res.data ?? {};
  } catch (err) {
    throw new Error(describeWebhookError(err, 'request submission'));
  }

  if (typeof data !== 'object' || data.success !== true || !data.request_id) {
    throw new Error(
      data?.message || 'The request could not be confirmed as saved. Please try again.',
    );
  }

  return {
    ...data,
    status: data.status ?? 'pending_human_review',
    humanApprovalRequired: true,
    bookingConfirmed: false,
  } as ServiceRequestResponse;
}

// ── Request list ──────────────────────────────────────────────────────────────

export interface RequestListItem {
  id: string;
  request_id: string;
  status: string;
  current_stage: number;
  issue_type: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export async function listRequests(): Promise<RequestListItem[]> {
  const res = await apiClient.get<RequestListItem[]>('/api/v1/requests');
  return res.data;
}

// ── Status polling ────────────────────────────────────────────────────────────

export async function getRequestStatus(id: string): Promise<LegalAidRequestStatus> {
  const res = await apiClient.get<LegalAidRequestStatus>(`/api/v1/requests/${id}/status`);
  return res.data;
}

// ── Booking approval ──────────────────────────────────────────────────────────

export async function approveBooking(
  id: string,
  slotId: string,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>(
    `/api/v1/requests/${id}/book`,
    { slot_id: slotId },
  );
  return res.data;
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export interface Authority {
  id: string;
  name: string;
  state: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  services: string[];
  issue_types: string[];
  eligible_categories: string[];
  hours: string;
}

export async function searchAuthorities(params?: {
  state?: string;
  district?: string;
  issue_type?: string;
  category?: string;
}): Promise<{ authorities: Authority[]; total: number }> {
  const res = await apiClient.get('/api/v1/discovery/authorities', { params });
  return res.data;
}

export async function getEligibilityCriteria(): Promise<{
  criteria: Record<string, { description: string; documents: string[]; income_limit: string }>;
}> {
  const res = await apiClient.get('/api/v1/discovery/eligibility-criteria');
  return res.data;
}

export async function getIssueTypes(): Promise<{ issue_types: string[] }> {
  const res = await apiClient.get('/api/v1/discovery/issue-types');
  return res.data;
}

export async function getStates(): Promise<{ states: string[] }> {
  const res = await apiClient.get('/api/v1/discovery/states');
  return res.data;
}

// ── Local storage helpers for request ID ─────────────────────────────────────

export const REQUEST_ID_KEY = 'lan_request_id';

export function saveRequestId(id: string) {
  localStorage.setItem(REQUEST_ID_KEY, id);
}

export function loadRequestId(): string | null {
  return localStorage.getItem(REQUEST_ID_KEY);
}

export function clearRequestId() {
  localStorage.removeItem(REQUEST_ID_KEY);
}

// ── Submitted form persistence (for AppointmentStatusPage) ────────────────────

export const SUBMITTED_FORM_KEY = 'lan_submitted_form';
export const SUBMITTED_AT_KEY = 'lan_submitted_at';
export const LOCAL_REQUEST_ID_KEY = 'lan_local_request_id';

export function saveSubmittedForm(form: ApplicationFormState, localRequestId: string) {
  localStorage.setItem(SUBMITTED_FORM_KEY, JSON.stringify(form));
  localStorage.setItem(SUBMITTED_AT_KEY, new Date().toISOString());
  localStorage.setItem(LOCAL_REQUEST_ID_KEY, localRequestId);
}

export function loadSubmittedForm(): { form: ApplicationFormState; submittedAt: string; localRequestId: string } | null {
  try {
    const raw = localStorage.getItem(SUBMITTED_FORM_KEY);
    const submittedAt = localStorage.getItem(SUBMITTED_AT_KEY);
    const localRequestId = localStorage.getItem(LOCAL_REQUEST_ID_KEY);
    if (raw && submittedAt && localRequestId) {
      return { form: JSON.parse(raw), submittedAt, localRequestId };
    }
  } catch { /* noop */ }
  return null;
}

export function clearSubmittedForm() {
  localStorage.removeItem(SUBMITTED_FORM_KEY);
  localStorage.removeItem(SUBMITTED_AT_KEY);
  localStorage.removeItem(LOCAL_REQUEST_ID_KEY);
}

// ── Record the n8n review result on the backend request ───────────────────────

export async function recordReview(
  backendId: string,
  review: { n8n_request_id: string; service_id: string; service_name: string; service_match_status: string },
): Promise<void> {
  await apiClient.post(`/api/v1/requests/${backendId}/review`, review);
}

/** The offline demo login (`test`/`test`) has no backend account, so it never calls the API. */
export function hasBackendSession(): boolean {
  try {
    const raw = localStorage.getItem('lan_auth');
    return !!raw && JSON.parse(raw).token !== 'demo-jwt-token';
  } catch {
    return false;
  }
}
