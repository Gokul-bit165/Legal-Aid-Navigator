import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { StepNav } from '../components/navigation/StepNav';
import { toast } from 'react-hot-toast';
import type { RecommendedService } from '../utils/n8nResponse';
import {
    submitServiceRequest, toStartTime, loadSubmittedForm, recordReview, loadRequestId, hasBackendSession,
} from '../services/api';
import type { ServiceRequestResponse } from '../services/api';

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────────── */

/** `needs_human_review` → `Needs human review` */
const humanize = (v: string): string => {
    const t = v.replace(/_/g, ' ').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

/** Strip common markdown artefacts: ### headings, **, \*\*, *, etc. */
const cleanMarkdown = (text: string): string =>
    text
        .replace(/\\?\*\*([^*]+)\\?\*\*/g, '$1')   // **bold** or \*\*bold\*\*
        .replace(/^#{1,6}\s+/gm, '')                // ### headings
        .replace(/^\s*[-*]\s+/gm, '• ')             // - or * bullets → •
        .replace(/\n{3,}/g, '\n\n')                  // collapse blank lines
        .trim();

/**
 * If the response `message` / `output` is a single markdown blob, try to break
 * it into named sections by looking for `### Section Name` or `**Section Name**`
 * header patterns.  Returns a Map of sectionName → content.
 */
const parseSections = (
    text: string,
): { key: string; title: string; body: string }[] => {
    // Split on markdown heading lines (### …) or bold lines (**…**)
    const sectionRegex = /(?:^|\n)(?:#{1,6}\s+|\\?\*\*)(.*?)(?:\\?\*\*)?[:\s]*\n/g;
    const parts: { key: string; title: string; body: string }[] = [];
    let lastIdx = 0;
    let lastTitle = '';
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(text)) !== null) {
        // Save the previous section body
        if (lastTitle) {
            parts.push({
                key: lastTitle.toLowerCase().replace(/\s+/g, '_'),
                title: lastTitle,
                body: cleanMarkdown(text.slice(lastIdx, match.index)),
            });
        } else if (match.index > 0) {
            // Text before the first heading → treat as preamble / summary
            const pre = cleanMarkdown(text.slice(0, match.index));
            if (pre) parts.push({ key: 'summary', title: 'Summary', body: pre });
        }
        lastTitle = match[1].replace(/\*+/g, '').replace(/\\?\*/g, '').trim();
        lastIdx = match.index + match[0].length;
    }

    // Remaining text after last heading
    if (lastTitle) {
        parts.push({
            key: lastTitle.toLowerCase().replace(/\s+/g, '_'),
            title: lastTitle,
            body: cleanMarkdown(text.slice(lastIdx)),
        });
    }

    // If no headings were found, return the whole text as a single "Summary" section
    if (parts.length === 0 && text.trim()) {
        parts.push({ key: 'summary', title: 'Summary', body: cleanMarkdown(text) });
    }

    return parts;
};

/** Render a multi-line plain-text string as paragraphs / bullet lists. */
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                if (!line.trim()) return <br key={i} />;
                if (line.trim().startsWith('•')) {
                    return (
                        <div key={i} style={{ paddingLeft: 12, lineHeight: 1.8 }}>
                            {line}
                        </div>
                    );
                }
                return (
                    <p key={i} style={{ margin: '4px 0', lineHeight: 1.7 }}>
                        {line}
                    </p>
                );
            })}
        </>
    );
};

/* Section icons keyed by normalised section key */
const sectionIcons: Record<string, string> = {
    summary:
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    missing_information:
        'M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z',
    urgency:
        'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    recommended_next_step:
        'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
    status:
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    next_steps:
        'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
};

const fallbackIcon =
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 12.9 12 13.5 12 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-1.66 1.34-3 3-3s3 1.34 3 3c0 .66-.27 1.26-.7 1.7l-.23.22z';

const SectionIcon: React.FC<{ sectionKey: string }> = ({ sectionKey }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: 20, height: 20, flexShrink: 0 }}
    >
        <path d={sectionIcons[sectionKey] ?? fallbackIcon} />
    </svg>
);

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────────────────────── */

export const AgentResponsePage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const raw = (location.state as any)?.n8nResponse;

    // Normalise into a record
    const response: Record<string, unknown> | null =
        raw == null
            ? null
            : typeof raw === 'string'
                ? { message: raw }
                : typeof raw === 'object'
                    ? (raw as Record<string, unknown>)
                    : { value: raw };

    // ── Extract well-known scalar fields ─────────────────────────────────────
    const bookingConfirmed =
        response?.bookingConfirmed === true ? true : response?.bookingConfirmed === false ? false : null;
    const humanApprovalRequired =
        response?.humanApprovalRequired === true
            ? true
            : response?.humanApprovalRequired === false
                ? false
                : null;
    const statusField =
        typeof response?.status === 'string' ? response.status : null;

    // ── Extract the main text blob (could be message, output, summary, text) ─
    const mainText: string =
        typeof response?.output === 'string'
            ? response.output
            : typeof response?.message === 'string'
                ? response.message
                : typeof response?.summary === 'string'
                    ? response.summary
                    : typeof response?.text === 'string'
                        ? response.text
                        : '';

    // ── If the response has explicit JSON keys for each section, use them ────
    const explicitSections: { key: string; title: string; body: string }[] = [];
    const sectionKeys = [
        { key: 'summary', title: 'Summary' },
        { key: 'missing_information', title: 'Missing Information' },
        { key: 'urgency', title: 'Urgency' },
        { key: 'recommended_next_step', title: 'Recommended Next Step' },
        { key: 'next_steps', title: 'Next Steps' },
    ];
    for (const { key, title } of sectionKeys) {
        const val = response?.[key];
        if (val != null && typeof val === 'string' && val.trim()) {
            explicitSections.push({ key, title, body: cleanMarkdown(val) });
        }
    }

    // ── If no explicit keys, try to parse sections out of the text blob ──────
    const sections =
        explicitSections.length > 0
            ? explicitSections
            : parseSections(mainText);

    const hasData =
        sections.length > 0 ||
        bookingConfirmed !== null ||
        humanApprovalRequired !== null ||
        statusField !== null;

    // ── Recommended services (max 3) ─────────────────────────────────────────
    const services: RecommendedService[] = Array.isArray(response?.recommended_services)
        ? (response!.recommended_services as RecommendedService[]).slice(0, 3)
        : [];

    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const selectedService = services.find(s => s.service_id === selectedServiceId) ?? null;

    // ── Request-review submission state ───────────────────────────────────────
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [requestResult, setRequestResult] = useState<ServiceRequestResponse | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);

    // Extract appointment preferences from the original response for the request payload
    const appointmentRequest = response?.appointment_request as
        { preferred_date?: string; preferred_time?: string; contact_mode?: string } | null | undefined;
    const preferredTime = toStartTime(appointmentRequest?.preferred_time ?? '');

    const handleSubmitForReview = async () => {
        if (!selectedService || submittingRequest || requestResult) return;
        if (!appointmentRequest?.preferred_date || !preferredTime) {
            const msg = 'A preferred date and time are required. Please go back and complete the appointment preferences.';
            setRequestError(msg);
            toast.error(msg);
            return;
        }

        try {
            setSubmittingRequest(true);
            setRequestError(null);

            const result = await submitServiceRequest({
                service_id: selectedService.service_id,
                service_name: selectedService.service_name,
                preferred_date: appointmentRequest?.preferred_date ?? '',
                preferred_time: preferredTime,
                contact_preference:
                    appointmentRequest?.contact_mode ||
                    loadSubmittedForm()?.form.contact.preferred_contact ||
                    '',
            });

            setRequestResult(result);
            const backendId = loadRequestId();
            if (hasBackendSession() && backendId && result.request_id) {
                recordReview(backendId, {
                    n8n_request_id: result.request_id,
                    service_id: selectedService.service_id,
                    service_name: selectedService.service_name,
                    service_match_status: result.service_match_status ?? 'unverified',
                }).catch(() => { /* staff record is best-effort; the review was already saved */ });
            }
            toast.success('Request submitted for human review');
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Failed to submit request. Please try again.';
            setRequestError(message);
            toast.error(message);
        } finally {
            setSubmittingRequest(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-ivory-200">
            <StepNav activeStep={6} />
            <div className="flex-1 flex items-center justify-center py-8 px-4">
                <div className="w-full max-w-2xl space-y-5 animate-fade-in">
                    {/* Header */}
                    <div className="card text-center">
                        <h2 className="text-2xl font-serif mb-2">AI Agent Response</h2>
                        <p className="text-sm text-bark-500" style={{ lineHeight: 1.6 }}>
                            {hasData
                                ? 'Your legal aid request has been processed. Here are the results.'
                                : 'Your request was submitted but no structured response was returned.'}
                        </p>
                    </div>

                    {/* ── Parsed Sections ─────────────────────────────────────────── */}
                    {sections.map((sec) => (
                        <div
                            key={sec.key}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid var(--color-border)',
                                borderRadius: 16,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Section header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '14px 20px',
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                }}
                            >
                                <SectionIcon sectionKey={sec.key} />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                                    {sec.title}
                                </span>
                            </div>

                            {/* Section body */}
                            <div style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--color-body)' }}>
                                <FormattedText text={sec.body} />
                            </div>
                        </div>
                    ))}

                    {/* ── Recommended Service Cards ──────────────────────────────── */}
                    {services.length > 0 && (
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '14px 20px',
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                    borderRadius: '16px 16px 0 0',
                                }}
                            >
                                <SectionIcon sectionKey="recommended_next_step" />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                                    Recommended Services ({services.length})
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0 0' }}>
                                {services.map((svc) => {
                                    const isSelected = selectedServiceId === svc.service_id;
                                    const isVerified = svc.verification_status.toLowerCase() === 'verified';

                                    return (
                                        <div
                                            key={svc.service_id}
                                            style={{
                                                background: '#FFFFFF',
                                                border: isSelected
                                                    ? '2px solid var(--color-primary)'
                                                    : '1px solid var(--color-border)',
                                                borderRadius: 12,
                                                overflow: 'hidden',
                                                transition: 'border-color 0.2s',
                                            }}
                                        >
                                            {/* Card header */}
                                            <div
                                                style={{
                                                    padding: '12px 18px',
                                                    background: isSelected ? 'var(--color-primary)' : '#F5F3ED',
                                                    color: isSelected ? '#fff' : 'var(--color-heading)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                                    {svc.service_name || 'Unnamed Service'}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        padding: '2px 8px',
                                                        borderRadius: 20,
                                                        background: isVerified ? '#dcfce7' : '#fef9c3',
                                                        color: isVerified ? '#166534' : '#854d0e',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {isVerified ? '✓ Verified' : '⚠ Unverified'}
                                                </span>
                                            </div>

                                            {/* Card body */}
                                            <div style={{ padding: '0 18px' }}>
                                                {svc.description && (
                                                    <p style={{ fontSize: '0.83rem', color: 'var(--color-body)', margin: '10px 0 6px', lineHeight: 1.6 }}>
                                                        {cleanMarkdown(svc.description)}
                                                    </p>
                                                )}

                                                <div style={{ fontSize: '0.82rem', color: 'var(--color-body)', padding: '6px 0 12px' }}>
                                                    {svc.why_it_may_help && (
                                                        <div style={rowStyle(0)}>
                                                            <span style={labelStyle}>Why Relevant</span>
                                                            <span style={valueStyle}>{cleanMarkdown(svc.why_it_may_help)}</span>
                                                        </div>
                                                    )}
                                                    <div style={rowStyle(1)}>
                                                        <span style={labelStyle}>Fee Status</span>
                                                        <span style={valueStyle}>{humanize(svc.fee_status)}</span>
                                                    </div>
                                                    <div style={rowStyle(0)}>
                                                        <span style={labelStyle}>Availability</span>
                                                        <span style={valueStyle}>{humanize(svc.availability_status)}</span>
                                                    </div>
                                                    {svc.official_source_url && (
                                                        <div style={rowStyle(1)}>
                                                            <span style={labelStyle}>Official Source</span>
                                                            <a
                                                                href={svc.official_source_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    ...valueStyle,
                                                                    color: 'var(--color-primary)',
                                                                    textDecoration: 'underline',
                                                                }}
                                                            >
                                                                Visit source ↗
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Select button */}
                                            <div style={{ padding: '0 18px 14px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    disabled={selectedServiceId !== null}
                                                    onClick={() => setSelectedServiceId(svc.service_id)}
                                                    style={{
                                                        padding: '8px 18px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        borderRadius: 8,
                                                        border: 'none',
                                                        cursor: selectedServiceId !== null ? 'not-allowed' : 'pointer',
                                                        background: isSelected
                                                            ? 'var(--color-primary)'
                                                            : selectedServiceId !== null
                                                                ? '#e5e5e5'
                                                                : 'var(--color-primary)',
                                                        color: isSelected || selectedServiceId === null ? '#fff' : '#999',
                                                        transition: 'background 0.2s',
                                                    }}
                                                >
                                                    {isSelected ? '✓ Selected' : 'Select this service'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Service Selection Banner + Submit for Review ─────────── */}
                    {selectedService && !requestResult && (
                        <div
                            style={{
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
                                Selected: {selectedService.service_name}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#78350f' }}>
                                Click below to submit this selection for human review. No appointment will be booked until a caseworker approves it.
                            </span>
                            {requestError && (
                                <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>
                                    {requestError}
                                </span>
                            )}
                            <button
                                type="button"
                                disabled={submittingRequest}
                                onClick={handleSubmitForReview}
                                style={{
                                    alignSelf: 'flex-end',
                                    padding: '10px 22px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: submittingRequest ? 'not-allowed' : 'pointer',
                                    background: submittingRequest ? '#d1d5db' : 'var(--color-primary)',
                                    color: '#fff',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {submittingRequest ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        </div>
                    )}

                    {/* ── Confirmed Request Result ─────────────────────────────── */}
                    {requestResult && (
                        <div
                            style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>
                                ✓ Request submitted for human review
                            </span>
                            {requestResult.request_id && (
                                <span style={{ fontSize: '0.82rem', color: '#15803d' }}>
                                    Request ID: <strong>{requestResult.request_id}</strong>
                                </span>
                            )}
                            <span style={{ fontSize: '0.82rem', color: '#15803d' }}>
                                Status: <strong>{requestResult.status}</strong>
                            </span>
                            {requestResult.message && (
                                <span style={{ fontSize: '0.82rem', color: '#15803d' }}>
                                    {requestResult.message}
                                </span>
                            )}
                            {requestResult.service_match_status === 'unverified' && (
                                <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>
                                    ⚠ Service unverified — a person must check this service before anything proceeds.
                                </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: '#166534', marginTop: 4 }}>
                                No appointment is booked and no provider is assigned. A caseworker will review your selection.
                            </span>
                        </div>
                    )}

                    {/* ── Status / Booking / Human Approval indicators ───────────── */}
                    {(statusField || bookingConfirmed !== null || humanApprovalRequired !== null) && (
                        <div
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid var(--color-border)',
                                borderRadius: 16,
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '14px 20px',
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                }}
                            >
                                <SectionIcon sectionKey="status" />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                    Appointment Status
                                </span>
                            </div>

                            <div style={{ padding: '4px 0' }}>
                                {statusField && (
                                    <div style={rowStyle(0)}>
                                        <span style={labelStyle}>Status</span>
                                        <span style={valueStyle}>{humanize(cleanMarkdown(statusField))}</span>
                                    </div>
                                )}
                                {bookingConfirmed !== null && (
                                    <div style={rowStyle(1)}>
                                        <span style={labelStyle}>Booking Confirmed</span>
                                        <span
                                            style={{
                                                ...valueStyle,
                                                color: bookingConfirmed === true ? '#16a34a' : '#dc2626',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {bookingConfirmed === true ? '✓ Yes' : '✗ No'}
                                        </span>
                                    </div>
                                )}
                                {humanApprovalRequired !== null && (
                                    <div style={rowStyle(2)}>
                                        <span style={labelStyle}>Human Approval</span>
                                        <span
                                            style={{
                                                ...valueStyle,
                                                color: humanApprovalRequired ? '#ea580c' : '#16a34a',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {humanApprovalRequired ? '⚠ Required' : '✓ Not Required'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Expandable raw JSON ──────────────────────────────────────── */}
                    <details className="card">
                        <summary
                            className="font-medium cursor-pointer"
                            style={{ padding: '14px 20px', fontSize: '0.9rem' }}
                        >
                            View full JSON response
                        </summary>
                        <pre
                            style={{
                                margin: 0,
                                padding: '12px 20px',
                                fontSize: '0.78rem',
                                lineHeight: 1.6,
                                overflowX: 'auto',
                                background: '#FAFAF5',
                                borderTop: '1px solid #EDE8DC',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {response ? JSON.stringify(response, null, 2) : 'No data returned from webhook.'}
                        </pre>
                    </details>

                    {/* ── Actions ───────────────────────────────────────────────────── */}
                    <div className="flex justify-center gap-4 pt-4 pb-6">
                        <Button type="button" variant="primary" onClick={() => navigate('/app/location')}>
                            Start New Request
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Inline styles matching the existing Consent page look ───────────────── */
const rowStyle = (idx: number): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '12px 20px',
    background: idx % 2 === 0 ? '#FAFAF5' : '#FFFFFF',
    borderBottom: '1px solid #EDE8DC',
});

const labelStyle: React.CSSProperties = {
    fontSize: '0.835rem',
    fontWeight: 500,
    color: 'var(--color-body)',
    minWidth: 160,
    flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-heading)',
    textAlign: 'right',
    wordBreak: 'break-word',
};
