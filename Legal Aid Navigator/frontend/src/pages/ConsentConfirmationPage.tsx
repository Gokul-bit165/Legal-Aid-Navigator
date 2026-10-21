import React, { useState } from 'react';
import { readLatestFormState, useFormContext } from '../contexts/FormContext';
import {
  submitToN8n, saveSubmittedForm, loadSubmittedForm, createRequest,
  saveRequestId, loadRequestId, hasBackendSession,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { toast } from 'react-hot-toast';
import { StepNav } from '../components/navigation/StepNav';
import type { ConsentFormData } from '../types';


/* ── prettify enum-style values ── */
const prettifyValue = (val: unknown): string => {
  if (val === '' || val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string') {
    // Free text, names and emails are shown exactly as typed; only enum-like codes are reformatted.
    if (!/^[a-z_]+$/.test(val)) return val;
    return val
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(val);
};

/* ── Section icons (inline SVG paths for zero dependencies) ── */
const SectionIcon: React.FC<{ type: string }> = ({ type }) => {
  const paths: Record<string, string> = {
    location:
      'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
    legal:
      'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    eligibility:
      'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
    contact:
      'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    appointment:
      'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ width: 20, height: 20 }}
    >
      <path d={paths[type] || paths.contact} />
    </svg>
  );
};

/* ── Main Component ── */
export const ConsentConfirmationPage: React.FC = () => {
  const { formState, updateConsent, markStepComplete } = useFormContext();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [consent, setConsent] = useState<ConsentFormData>({
    consent_use_of_info: formState.consent.consent_use_of_info,
    consent_accuracy: formState.consent.consent_accuracy,
    consent_booking_approval: formState.consent.consent_booking_approval,
  });

  const setConsentField = (field: keyof ConsentFormData, checked: boolean) => {
    const next = { ...consent, [field]: checked };
    setConsent(next);
    updateConsent(next);
    setConsentError('');
  };

  const handleFinish = async () => {
    const missing: string[] = [];
    if (consent.consent_use_of_info !== true) missing.push('data-use consent');
    if (consent.consent_booking_approval !== true) missing.push('booking authorization');
    if (consent.consent_accuracy !== true) missing.push('accuracy confirmation');

    if (missing.length) {
      setConsentError(`Please provide: ${missing.join(', ')}.`);
      toast.error('Please complete the missing consent before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      updateConsent(consent);
      const latest = {
        ...readLatestFormState(),
        consent,
      };
      // Workflow 1: recommendations only. The request-review webhook (Workflow 2)
      // is called from the results page once a service is explicitly selected.
      const response = await submitToN8n(latest);

      // Keep a backend record so staff can see the application. Skipped for the offline demo
      // login, and not repeated if the same form was already stored (no duplicate on resubmit).
      const previous = loadSubmittedForm();
      const alreadyStored =
        !!loadRequestId() && JSON.stringify(previous?.form) === JSON.stringify(latest);
      if (hasBackendSession() && !alreadyStored) {
        try {
          const created = await createRequest(latest);
          saveRequestId(created.id);
        } catch {
          toast.error('Your recommendations are ready, but the application could not be saved for staff.');
        }
      }
      saveSubmittedForm(latest, loadRequestId() ?? `pending-${Date.now()}`);

      markStepComplete(6);
      toast.success('Recommendations ready. Select a service to submit for human review.');
      navigate('/agent-response', { state: { n8nResponse: response } });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to submit your request. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };


  /* Build sections to render */
  const sections: {
    title: string;
    icon: string;
    rows: { label: string; value: string }[];
  }[] = [
      {
        title: 'Location Details',
        icon: 'location',
        rows: [
          { label: 'Country', value: prettifyValue(formState.location.country) },
          { label: 'State', value: prettifyValue(formState.location.state) },
          { label: 'District', value: prettifyValue(formState.location.district) },
          { label: 'City / Town / Village', value: prettifyValue(formState.location.city) },
          { label: 'PIN Code', value: prettifyValue(formState.location.pin_code) },
        ],
      },
      {
        title: 'Legal Issue',
        icon: 'legal',
        rows: [
          { label: 'Issue Type', value: prettifyValue(formState.legal_issue.issue_type) },
          { label: 'Description', value: prettifyValue(formState.legal_issue.description) },
          { label: 'Court Case In Progress', value: prettifyValue(formState.legal_issue.court_case_in_progress) },
          { label: 'Court Deadline', value: prettifyValue(formState.legal_issue.court_deadline) },
          { label: 'Urgency', value: prettifyValue(formState.legal_issue.urgency) },
        ],
      },
      {
        title: 'Eligibility Details',
        icon: 'eligibility',
        rows: [
          { label: 'Category', value: prettifyValue(formState.eligibility.eligibility_category) },
          { label: 'Details', value: prettifyValue(formState.eligibility.eligibility_details) },
          { label: 'Supporting Document', value: prettifyValue(formState.eligibility.supporting_document) },
        ],
      },
      {
        title: 'Contact Details',
        icon: 'contact',
        rows: [
          { label: 'Full Name', value: prettifyValue(formState.contact.full_name) },
          { label: 'Mobile Number', value: prettifyValue(formState.contact.mobile_number) },
          { label: 'Email', value: prettifyValue(formState.contact.email) },
          { label: 'Preferred Contact', value: prettifyValue(formState.contact.preferred_contact) },
          { label: 'Consultation Mode', value: prettifyValue(formState.contact.consultation_mode) },
        ],
      },
      {
        title: 'Appointment Preferences',
        icon: 'appointment',
        rows: [
          { label: 'Preferred Date', value: prettifyValue(formState.appointment.preferred_date) },
          { label: 'Preferred Time Slot', value: prettifyValue(formState.appointment.preferred_time_slot) },
          { label: 'Consultation Mode', value: prettifyValue(formState.appointment.consultation_mode) },
          { label: 'Alternate Date', value: prettifyValue(formState.appointment.alt_date) },
          { label: 'Alternate Time Slot', value: prettifyValue(formState.appointment.alt_time_slot) },
          { label: 'Additional Notes', value: prettifyValue(formState.appointment.additional_notes) },
        ],
      },
    ];

  return (
    <div className="flex flex-col min-h-screen bg-ivory-200">
      <StepNav activeStep={6} />

      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl space-y-5 animate-fade-in">
          {/* Header card */}
          <div className="card text-center">
            <h2 className="text-2xl font-serif mb-2">Consent &amp; Confirmation</h2>
            <p className="text-sm text-bark-500" style={{ lineHeight: 1.6 }}>
              Please review all the information you've provided before submitting your legal aid application.
            </p>
          </div>

          {/* Summary sections */}
          {sections.map((sec) => (
            <div
              key={sec.title}
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
                <SectionIcon type={sec.icon} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                  {sec.title}
                </span>
              </div>

              {/* Rows */}
              <div style={{ padding: '4px 0' }}>
                {sec.rows.map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                      padding: '12px 20px',
                      background: idx % 2 === 0 ? '#FAFAF5' : '#FFFFFF',
                      borderBottom:
                        idx < sec.rows.length - 1 ? '1px solid #EDE8DC' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.835rem',
                        fontWeight: 500,
                        color: 'var(--color-body)',
                        minWidth: 160,
                        flexShrink: 0,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--color-heading)',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Explicit consent — mapped to the webhook payload, not implied by Finish */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderLeft: '4px solid var(--color-primary)',
            }}
          >
            <p
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--color-heading)',
                margin: 0,
              }}
            >
              Consent is required before this request can be processed
            </p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={consent.consent_accuracy === true}
                onChange={(e) => setConsentField('consent_accuracy', e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>I confirm that the information above is true and accurate to the best of my knowledge.</span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={consent.consent_use_of_info === true}
                onChange={(e) => setConsentField('consent_use_of_info', e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>I consent to the use of this information for legal aid processing.</span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={consent.consent_booking_approval === true}
                onChange={(e) => setConsentField('consent_booking_approval', e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                I authorize a consultation booking request based on my preferences. A human must still approve before
                any appointment is confirmed.
              </span>
            </label>
            {consentError && (
              <p style={{ margin: 0, color: 'var(--color-error)', fontSize: '0.82rem' }}>{consentError}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center gap-4 pb-4">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/app/appointment')}
            >
              ← Go Back
            </button>
            <Button type="button" variant="primary" onClick={handleFinish} loading={submitting}>
              ✓ Finish &amp; Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
