import type { ApplicationFormState } from '../types';

export interface N8nWebhookPayload {
  location: {
    state: string;
    district: string;
    pincode: string;
    city: string;
    country: string;
  };
  legalIssue: {
    category: string;
    description: string;
    urgent: boolean;
    courtCaseInProgress: string;
    courtDeadline: string;
  };
  eligibility: {
    category: string;
    details: string;
    supportingDocumentAvailable: boolean | null;
  };
  appointment: {
    mode: string;
    preferredDate: string;
    preferredTimeSlot: string;
    altDate: string;
    altTimeSlot: string;
    additionalNotes: string;
  };
  contact: {
    preferredContact: string;
    consultationMode: string;
  };
  consent: {
    dataUseAccepted: boolean | null;
    bookingAuthorization: boolean | null;
    accuracyAcknowledged: boolean | null;
  };
}

function asTriState(value: boolean | null | undefined): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function buildN8nPayload(form: ApplicationFormState): N8nWebhookPayload {
  const supporting = form.eligibility.supporting_document;
  return {
    location: {
      state: form.location.state,
      district: form.location.district,
      pincode: form.location.pin_code,
      city: form.location.city,
      country: form.location.country,
    },
    legalIssue: {
      category: form.legal_issue.issue_type,
      description: form.legal_issue.description,
      urgent: form.legal_issue.urgency === 'urgent',
      courtCaseInProgress: form.legal_issue.court_case_in_progress,
      courtDeadline: form.legal_issue.court_deadline,
    },
    eligibility: {
      category: form.eligibility.eligibility_category,
      details: form.eligibility.eligibility_details,
      supportingDocumentAvailable:
        supporting === 'yes' ? true : supporting === 'no' ? false : supporting === 'unsure' ? null : null,
    },
    appointment: {
      mode: form.appointment.consultation_mode,
      preferredDate: form.appointment.preferred_date,
      preferredTimeSlot: form.appointment.preferred_time_slot,
      altDate: form.appointment.alt_date,
      altTimeSlot: form.appointment.alt_time_slot,
      additionalNotes: form.appointment.additional_notes,
    },
    // Contact identifiers are intentionally omitted from the webhook payload.
    // Only non-identifying preference fields are sent.
    contact: {
      preferredContact: form.contact.preferred_contact,
      consultationMode: form.contact.consultation_mode,
    },
    consent: {
      dataUseAccepted: asTriState(form.consent.consent_use_of_info),
      bookingAuthorization: asTriState(form.consent.consent_booking_approval),
      accuracyAcknowledged: asTriState(form.consent.consent_accuracy),
    },
  };
}

/** Safe summary for local debugging — never includes applicant contact details. */
export function payloadDebugSummary(payload: N8nWebhookPayload) {
  return {
    location: {
      state: payload.location.state,
      district: payload.location.district,
      hasPincode: Boolean(payload.location.pincode),
    },
    legalIssue: {
      category: payload.legalIssue.category,
      urgent: payload.legalIssue.urgent,
      descriptionLength: payload.legalIssue.description.length,
    },
    eligibility: {
      category: payload.eligibility.category,
      supportingDocumentAvailable: payload.eligibility.supportingDocumentAvailable,
    },
    appointment: {
      mode: payload.appointment.mode,
      hasPreferredDate: Boolean(payload.appointment.preferredDate),
    },
    contact: {
      preferredContact: payload.contact.preferredContact,
      consultationMode: payload.contact.consultationMode,
    },
    consent: payload.consent,
  };
}
