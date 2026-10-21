
export interface RecommendedService {
  service_id: string;
  service_name: string;
  description: string;
  why_it_may_help: string;
  fee_status: string;
  availability_status: string;
  official_source_url: string;
  verification_status: string;
  next_step: string;
}

export interface AppointmentRequest {
  requested_service: string;
  preferred_date: string;
  preferred_time: string;
  contact_mode: string;
  status: string;
}

export interface ParsedAgentResponse {
  summary: string;
  missing_information: string;
  urgency: string;
  recommended_next_step: string;
  status: string;
  bookingConfirmed: boolean;
  humanApprovalRequired: boolean;
  officialDirectoryChecked?: boolean;
  recommended_services: RecommendedService[];
  appointment_request: AppointmentRequest | null;
  urgent_reason: string;
}

export type ParseResult =
  | { ok: true; data: ParsedAgentResponse }
  | { ok: false; error: string };

const REQUIRED_STRING_FIELDS = [
  'summary',
  'missing_information',
  'urgency',
  'recommended_next_step',
  'status',
] as const;

function tryParseJsonText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function unwrapRecord(raw: unknown, depth = 0): Record<string, unknown> | null {
  if (raw == null || depth > 8) return null;

  if (typeof raw === 'string') {
    const parsed = tryParseJsonText(raw);
    return parsed == null ? null : unwrapRecord(parsed, depth + 1);
  }

  if (Array.isArray(raw)) {
    if (raw.length === 1) return unwrapRecord(raw[0], depth + 1);

    const merged: Record<string, unknown> = {};
    for (const item of raw) {
      const rec = unwrapRecord(item, depth + 1);
      if (rec) Object.assign(merged, rec);
    }
    return Object.keys(merged).length ? merged : null;
  }

  if (typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  if (REQUIRED_STRING_FIELDS.some((key) => obj[key] != null)) {
    return obj;
  }

  for (const key of ['json', 'data', 'body', 'output', 'message', 'text', 'response']) {
    const nested = obj[key];
    if (nested == null) continue;

    const inner = unwrapRecord(nested, depth + 1);
    if (inner && REQUIRED_STRING_FIELDS.some((field) => inner[field] != null)) {
      return { ...obj, ...inner };
    }
  }

  return obj;
}

function fieldToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return sanitizeDisplayText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(fieldToText).filter(Boolean).join('\n');
  }
  return sanitizeDisplayText(JSON.stringify(value));
}

export function sanitizeDisplayText(input: string): string {
  let text = input.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<\/?svg[^>]*>/gi, '');
  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, '');
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  );
  text = text.replace(/\\?\*\*([^*]+)\\?\*\*/g, '$1');
  text = text.replace(/\\?\*([^*]+)\\?\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*]\s+/gm, '• ');
  text = text.replace(/\bsvg\b/gi, '');
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'yes') return true;
    if (v === 'false' || v === 'no') return false;
  }
  return null;
}

function stripDuplicateHeading(body: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^(?:${escaped}|${escaped.replace(/\s+/g, '_')})\\s*[:\\-–]?\\s*`,
    'i'
  );
  return body.replace(pattern, '').trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseServices(value: unknown): RecommendedService[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 3).flatMap((item) => {
    const service = asRecord(item);
    if (!service) return [];

    const rawUrl = fieldToText(service.official_source_url);

    return [{
      service_id: fieldToText(service.service_id) || `svc-${Math.random().toString(36).slice(2, 8)}`,
      service_name: fieldToText(service.service_name),
      description: fieldToText(service.description),
      why_it_may_help: fieldToText(service.why_it_may_help),
      fee_status: fieldToText(service.fee_status) || 'Unknown',
      availability_status: fieldToText(service.availability_status) ||
        'Availability needs confirmation.',
      official_source_url: isValidUrl(rawUrl) ? rawUrl : '',
      verification_status: fieldToText(service.verification_status) || 'unverified',
      next_step: fieldToText(service.next_step),
    }];
  });
}

function parseAppointment(value: unknown): AppointmentRequest | null {
  const appointment = asRecord(value);
  if (!appointment) return null;

  return {
    requested_service: fieldToText(appointment.requested_service),
    preferred_date: fieldToText(appointment.preferred_date ?? appointment.preferredDate),
    preferred_time: fieldToText(appointment.preferred_time ?? appointment.preferred_time_slot ?? appointment.preferredTimeSlot),
    contact_mode: fieldToText(appointment.contact_mode ?? appointment.contact_method ?? appointment.mode),
    status: fieldToText(appointment.status) || 'pending_human_review',
  };
}

/**
 * A webhook response alone never confirms an appointment.
 * Only a separate authorized booking process can do that.
 */
function resolveBookingConfirmed(
  raw: Record<string, unknown>,
  parsedTrue: boolean
): boolean {
  if (!parsedTrue) return false;

  return raw.officialBookingConfirmation === true ||
    raw.bookingProcessConfirmed === true ||
    raw.authorizedBookingConfirmed === true;
}

export function parseN8nResponse(raw: unknown): ParseResult {
  const record = unwrapRecord(raw);

  if (!record) {
    return {
      ok: false,
      error: 'The agent did not return valid JSON. Please try submitting again in a moment.',
    };
  }

  const missingKeys = REQUIRED_STRING_FIELDS.filter(
    (key) => record[key] == null || record[key] === ''
  );

  if (missingKeys.length) {
    return {
      ok: false,
      error: 'The agent response was incomplete, so it cannot be shown. Please try submitting again.',
    };
  }

  const bookingRaw = asBoolean(record.bookingConfirmed);
  const approvalRaw = asBoolean(record.humanApprovalRequired);

  if (bookingRaw === null || approvalRaw === null) {
    return {
      ok: false,
      error: 'The agent response was incomplete, so it cannot be shown. Please try submitting again.',
    };
  }

  return {
    ok: true,
    data: {
      summary: stripDuplicateHeading(fieldToText(record.summary), 'Summary'),
      missing_information:
        stripDuplicateHeading(fieldToText(record.missing_information), 'Missing Information') ||
        'None identified from the submitted request.',
      urgency: stripDuplicateHeading(fieldToText(record.urgency), 'Urgency'),
      recommended_next_step: stripDuplicateHeading(
        fieldToText(record.recommended_next_step),
        'Recommended Next Step'
      ),
      status: stripDuplicateHeading(fieldToText(record.status), 'Status'),
      bookingConfirmed: resolveBookingConfirmed(record, bookingRaw),
      humanApprovalRequired: true,
      officialDirectoryChecked: record.officialDirectoryChecked === true,
      recommended_services: parseServices(record.recommended_services),
      appointment_request: parseAppointment(record.appointment_request),
      urgent_reason: fieldToText(record.urgent_reason),
    },
  };
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;]+$/, '')))];
}
