import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApplicationFormState, EMPTY_FORM_STATE, LocationFormData, LegalIssueFormData, EligibilityFormData, ContactFormData, AppointmentFormData, ConsentFormData } from '../types';

interface FormContextType {
  formState: ApplicationFormState;
  updateLocation: (data: Partial<LocationFormData>) => void;
  updateLegalIssue: (data: Partial<LegalIssueFormData>) => void;
  updateEligibility: (data: Partial<EligibilityFormData>) => void;
  updateContact: (data: Partial<ContactFormData>) => void;
  updateAppointment: (data: Partial<AppointmentFormData>) => void;
  updateConsent: (data: Partial<ConsentFormData>) => void;
  markStepComplete: (step: number) => void;
  setCurrentStep: (step: number) => void;
  resetForm: () => void;
}

const FormContext = createContext<FormContextType | null>(null);

export const SESSION_KEY = 'lan_form_state';

function mergeFormState(saved: Partial<ApplicationFormState> | null | undefined): ApplicationFormState {
  const parsed = saved ?? {};
  return {
    ...EMPTY_FORM_STATE,
    ...parsed,
    location: { ...EMPTY_FORM_STATE.location, ...parsed.location },
    legal_issue: { ...EMPTY_FORM_STATE.legal_issue, ...parsed.legal_issue },
    eligibility: { ...EMPTY_FORM_STATE.eligibility, ...parsed.eligibility },
    contact: { ...EMPTY_FORM_STATE.contact, ...parsed.contact },
    appointment: { ...EMPTY_FORM_STATE.appointment, ...parsed.appointment },
    consent: { ...EMPTY_FORM_STATE.consent, ...parsed.consent },
    completedSteps: parsed.completedSteps ?? [],
    currentStep: parsed.currentStep ?? 1,
  };
}

function loadFromSession(): ApplicationFormState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? mergeFormState(JSON.parse(raw)) : EMPTY_FORM_STATE;
  } catch {
    return EMPTY_FORM_STATE;
  }
}

/** Latest persisted form values — avoids submitting a stale React snapshot. */
export function readLatestFormState(): ApplicationFormState {
  return loadFromSession();
}

function saveToSession(state: ApplicationFormState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

export function FormProvider({ children }: { children: ReactNode }) {
  const [formState, setFormState] = useState<ApplicationFormState>(loadFromSession);

  const update = useCallback(<K extends keyof ApplicationFormState>(
    key: K,
    data: Partial<ApplicationFormState[K]>
  ) => {
    setFormState(prev => {
      const next = { ...prev, [key]: { ...(prev[key] as object), ...data } };
      saveToSession(next);
      return next;
    });
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setFormState(prev => {
      const steps = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];
      const next = { ...prev, completedSteps: steps };
      saveToSession(next);
      return next;
    });
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setFormState(prev => {
      const next = { ...prev, currentStep: step };
      saveToSession(next);
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setFormState(EMPTY_FORM_STATE);
  }, []);

  return (
    <FormContext.Provider value={{
      formState,
      updateLocation: (d) => update('location', d),
      updateLegalIssue: (d) => update('legal_issue', d),
      updateEligibility: (d) => update('eligibility', d),
      updateContact: (d) => update('contact', d),
      updateAppointment: (d) => update('appointment', d),
      updateConsent: (d) => update('consent', d),
      markStepComplete,
      setCurrentStep,
      resetForm,
    }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useFormContext must be used within FormProvider');
  return ctx;
}
