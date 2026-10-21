import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, FileText, ShieldCheck, User, Phone, Mail,
  Calendar, Clock, MonitorSmartphone, Info, Pencil,
  CheckCircle2, Loader2, XCircle, AlertCircle, RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { StepNav } from '../components/navigation/StepNav';
import {
  getRequestStatus,
  approveBooking,
  loadRequestId,
  loadSubmittedForm,
} from '../services/api';
import type {
  LegalAidRequestStatus,
  WorkflowStage,
  StageStatus,
  AppointmentSlot,
} from '../types/status';
import type { ApplicationFormState } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;

const STAGE_META: { icon: React.ReactNode; description: string }[] = [
  {
    icon: <ClipboardList size={22} />,
    description:
      'Your legal aid request has been received and logged in our system.',
  },
  {
    icon: <MapPin size={22} />,
    description:
      'We are searching for relevant legal aid authorities and services based on your location and issue type.',
  },
  {
    icon: <ShieldCheck size={22} />,
    description:
      'We are checking your eligibility based on the information you provided and the criteria of the relevant legal aid authority.',
  },
  {
    icon: <Calendar size={22} />,
    description:
      'We are retrieving available appointment slots from the relevant authority.',
  },
  {
    icon: <Clock size={22} />,
    description:
      'We are booking your appointment with the legal aid authority based on your preferences.',
  },
  {
    icon: <CheckCircle2 size={22} />,
    description:
      'Your appointment has been confirmed. You will receive further communication from the authority.',
  },
];

// ── Helper components ─────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: StageStatus | string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending:           { label: 'Pending',            cls: 'badge-pending' },
    in_progress:       { label: 'In Progress',        cls: 'badge-in-progress' },
    completed:         { label: 'Completed',          cls: 'badge-completed' },
    failed:            { label: 'Failed',             cls: 'badge-failed' },
    awaiting_approval: { label: 'Awaiting Approval',  cls: 'badge-awaiting' },
  };
  const cfg = map[status] ?? { label: status, cls: 'badge-pending' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
};

const SubTaskRow: React.FC<{ label: string; description?: string; status: StageStatus; completedAt?: string }> = ({
  label, description, status, completedAt,
}) => {
  const icon =
    status === 'completed'   ? <CheckCircle2 size={18} className="subtask-icon completed" /> :
    status === 'in_progress' ? <Loader2 size={18} className="subtask-icon in-progress animate-spin" /> :
    status === 'failed'      ? <XCircle size={18} className="subtask-icon failed" />          :
                               <div className="subtask-dot" />;

  return (
    <div className="subtask-row">
      {icon}
      <div className="subtask-body">
        <p className="subtask-label">{label}</p>
        {description && <p className="subtask-desc">{description}</p>}
      </div>
      {completedAt && (
        <span className="subtask-time">
          <StatusBadge status="completed" />
          <span className="subtask-ts">{formatTs(completedAt)}</span>
        </span>
      )}
      {status === 'in_progress' && (
        <StatusBadge status="in_progress" />
      )}
      {status === 'failed' && (
        <StatusBadge status="failed" />
      )}
    </div>
  );
};

// ── Formatters ────────────────────────────────────────────────────────────────

function formatTs(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatDateDisplay(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function prettifyMode(mode?: string): string {
  if (!mode) return '—';
  const map: Record<string, string> = {
    in_person: 'In person',
    phone: 'Phone',
    video: 'Video call',
  };
  return map[mode] ?? mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function prettifyValue(val?: string): string {
  if (!val) return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Stage progress tracker ────────────────────────────────────────────────────

const STAGE_NAMES = [
  'Request\nSubmitted',
  'Finding Relevant\nServices',
  'Verifying\nEligibility',
  'Fetching\nAppointment Slots',
  'Booking\nAppointment',
  'Confirmation',
];

const ProgressTracker: React.FC<{ stages: WorkflowStage[]; currentStage: number }> = ({ stages, currentStage }) => {
  return (
    <div className="progress-tracker">
      {stages.map((stage, idx) => {
        const isCompleted = stage.status === 'completed';
        const isActive = stage.stage_number === currentStage && stage.status !== 'completed';
        const isFailed = stage.status === 'failed';

        return (
          <React.Fragment key={stage.stage_number}>
            {/* Connector line */}
            {idx > 0 && (
              <div className={`tracker-line ${stages[idx - 1].status === 'completed' ? 'tracker-line-done' : ''}`} />
            )}

            {/* Node */}
            <div className="tracker-node-wrap">
              <div
                className={`tracker-node ${
                  isFailed   ? 'tracker-node-failed'    :
                  isCompleted ? 'tracker-node-done'     :
                  isActive    ? 'tracker-node-active'   :
                                'tracker-node-pending'
                }`}
              >
                {isCompleted && <CheckCircle2 size={14} />}
                {isFailed    && <XCircle size={14} />}
                {!isCompleted && !isFailed && <span>{stage.stage_number}</span>}
              </div>
              <div className="tracker-label-block">
                <p className={`tracker-label ${isActive ? 'tracker-label-active' : ''}`}>
                  {STAGE_NAMES[idx].split('\n').map((line, i) => (
                    <React.Fragment key={i}>{line}{i < STAGE_NAMES[idx].split('\n').length - 1 && <br />}</React.Fragment>
                  ))}
                </p>
                <p className={`tracker-sub-status ${
                  isCompleted ? 'ts-completed' :
                  isActive    ? 'ts-inprogress':
                  isFailed    ? 'ts-failed'    :
                                'ts-pending'
                }`}>
                  {isCompleted ? 'Completed' :
                   isActive ? 'In Progress' :
                   isFailed ? 'Failed' : 'Pending'}
                </p>
                {isCompleted && stage.completed_at && (
                  <p className="tracker-ts">{formatTs(stage.completed_at)}</p>
                )}
                {isActive && stage.started_at && (
                  <p className="tracker-ts">Since {formatTs(stage.started_at)}</p>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Local form data progress tracker (static after submission) ────────────────

const LocalProgressTracker: React.FC<{ submittedAt: string }> = ({ submittedAt }) => {
  const localStages = STAGE_NAMES.map((name, idx) => ({
    stage_number: idx + 1,
    name,
    status: idx === 0 ? 'completed' : idx === 1 ? 'in_progress' : 'pending',
    started_at: idx === 0 ? submittedAt : undefined,
    completed_at: idx === 0 ? submittedAt : undefined,
  }));

  return (
    <div className="progress-tracker">
      {localStages.map((stage, idx) => {
        const isCompleted = stage.status === 'completed';
        const isActive = stage.status === 'in_progress';

        return (
          <React.Fragment key={stage.stage_number}>
            {idx > 0 && (
              <div className={`tracker-line ${localStages[idx - 1].status === 'completed' ? 'tracker-line-done' : ''}`} />
            )}
            <div className="tracker-node-wrap">
              <div
                className={`tracker-node ${
                  isCompleted ? 'tracker-node-done'    :
                  isActive    ? 'tracker-node-active'  :
                                'tracker-node-pending'
                }`}
              >
                {isCompleted && <CheckCircle2 size={14} />}
                {!isCompleted && <span>{stage.stage_number}</span>}
              </div>
              <div className="tracker-label-block">
                <p className={`tracker-label ${isActive ? 'tracker-label-active' : ''}`}>
                  {STAGE_NAMES[idx].split('\n').map((line, i) => (
                    <React.Fragment key={i}>{line}{i < STAGE_NAMES[idx].split('\n').length - 1 && <br />}</React.Fragment>
                  ))}
                </p>
                <p className={`tracker-sub-status ${
                  isCompleted ? 'ts-completed' :
                  isActive    ? 'ts-inprogress':
                                'ts-pending'
                }`}>
                  {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
                </p>
                {isCompleted && stage.completed_at && (
                  <p className="tracker-ts">{formatTs(stage.completed_at)}</p>
                )}
                {isActive && (
                  <p className="tracker-ts">Since {formatTs(submittedAt)}</p>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Sidebar (live API data) ────────────────────────────────────────────────────

const RequestSummary: React.FC<{ data: LegalAidRequestStatus; onEdit: () => void }> = ({ data, onEdit }) => {
  const s = data.summary;
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <MapPin size={14} />,          label: 'Location',            value: s.location           || '—' },
    { icon: <FileText size={14} />,        label: 'Legal issue',         value: s.legal_issue        || '—' },
    { icon: <ShieldCheck size={14} />,     label: 'Eligibility category',value: s.eligibility_category || '—' },
    { icon: <User size={14} />,            label: 'Name',                value: s.name               || '—' },
    { icon: <Phone size={14} />,           label: 'Mobile number',       value: s.mobile_number      || '—' },
    { icon: <Mail size={14} />,            label: 'Email address',       value: s.email              || '—' },
  ];
  const apptRows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Calendar size={14} />, label: 'Preferred date',      value: formatDateDisplay(s.preferred_date)   },
    { icon: <Clock size={14} />,    label: 'Preferred time slot', value: s.preferred_time_slot || '—'          },
    { icon: <MonitorSmartphone size={14} />, label: 'Consultation mode', value: prettifyMode(s.consultation_mode) },
  ];

  return (
    <aside className="status-sidebar">
      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <span className="sidebar-card-title">Request Summary</span>
          <button className="sidebar-edit-btn" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </button>
        </div>
        <div className="sidebar-rows">
          {rows.map(r => (
            <div key={r.label} className="sidebar-row">
              <span className="sidebar-row-icon">{r.icon}</span>
              <span className="sidebar-row-label">{r.label}</span>
              <span className="sidebar-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <span className="sidebar-card-title">
            <Calendar size={15} style={{ display: 'inline', marginRight: 6 }} />
            Appointment Details
          </span>
        </div>
        <div className="sidebar-rows">
          {apptRows.map(r => (
            <div key={r.label} className="sidebar-row">
              <span className="sidebar-row-icon">{r.icon}</span>
              <span className="sidebar-row-label">{r.label}</span>
              <span className="sidebar-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-note">
        <Info size={15} className="sidebar-note-icon" />
        <div>
          <p className="sidebar-note-title">Please note</p>
          <p className="sidebar-note-body">
            The timelines are indicative and may vary depending on the relevant legal
            aid authority's process. You will be notified once your appointment is confirmed.
          </p>
        </div>
      </div>
    </aside>
  );
};

// ── Sidebar (local form data fallback) ───────────────────────────────────────

const LocalRequestSummary: React.FC<{ form: ApplicationFormState; onEdit: () => void }> = ({ form, onEdit }) => {
  const loc = form.location;
  const locationStr = [loc.state, loc.district, loc.city].filter(Boolean).join(', ') || '—';

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <MapPin size={14} />,      label: 'Location',            value: locationStr },
    { icon: <FileText size={14} />,    label: 'Legal issue',         value: prettifyValue(form.legal_issue.issue_type) },
    { icon: <ShieldCheck size={14} />, label: 'Eligibility category',value: prettifyValue(form.eligibility.eligibility_category) },
    { icon: <User size={14} />,        label: 'Name',                value: form.contact.full_name || '—' },
    { icon: <Phone size={14} />,       label: 'Mobile number',       value: form.contact.mobile_number || '—' },
    { icon: <Mail size={14} />,        label: 'Email address',       value: form.contact.email || '—' },
  ];

  const appt = form.appointment;
  const apptRows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Calendar size={14} />,          label: 'Preferred date',      value: formatDateDisplay(appt.preferred_date) },
    { icon: <Clock size={14} />,             label: 'Preferred time slot', value: appt.preferred_time_slot || '—' },
    { icon: <MonitorSmartphone size={14} />, label: 'Consultation mode',   value: prettifyMode(appt.consultation_mode) },
  ];

  return (
    <aside className="status-sidebar">
      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <span className="sidebar-card-title">Request Summary</span>
          <button className="sidebar-edit-btn" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </button>
        </div>
        <div className="sidebar-rows">
          {rows.map(r => (
            <div key={r.label} className="sidebar-row">
              <span className="sidebar-row-icon">{r.icon}</span>
              <span className="sidebar-row-label">{r.label}</span>
              <span className="sidebar-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-card">
        <div className="sidebar-card-header">
          <span className="sidebar-card-title">
            <Calendar size={15} style={{ display: 'inline', marginRight: 6 }} />
            Appointment Details
          </span>
        </div>
        <div className="sidebar-rows">
          {apptRows.map(r => (
            <div key={r.label} className="sidebar-row">
              <span className="sidebar-row-icon">{r.icon}</span>
              <span className="sidebar-row-label">{r.label}</span>
              <span className="sidebar-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-note">
        <Info size={15} className="sidebar-note-icon" />
        <div>
          <p className="sidebar-note-title">Please note</p>
          <p className="sidebar-note-body">
            The timelines are indicative and may vary depending on the relevant legal
            aid authority's process. You will be notified once your appointment is confirmed.
          </p>
        </div>
      </div>
    </aside>
  );
};

// ── Stage detail panel ────────────────────────────────────────────────────────

const CurrentStagePanel: React.FC<{
  stage: WorkflowStage;
  slots?: AppointmentSlot[];
  onApproveBooking: (slotId: string) => void;
  bookingLoading: boolean;
}> = ({ stage, slots, onApproveBooking, bookingLoading }) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const meta = STAGE_META[stage.stage_number - 1];

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-icon-wrap">
          {meta?.icon}
        </div>
        <div className="stage-panel-title-block">
          <h3 className="stage-panel-title">Step {stage.stage_number}: {stage.name}</h3>
          <p className="stage-panel-desc">{meta?.description}</p>
        </div>
        <StatusBadge status={stage.status} />
      </div>

      {stage.subtasks.length > 0 && (
        <div className="stage-subtasks">
          {stage.subtasks.map(t => (
            <SubTaskRow
              key={t.id}
              label={t.label}
              description={t.description}
              status={t.status}
              completedAt={t.completed_at}
            />
          ))}
        </div>
      )}

      {stage.error && (
        <div className="stage-error">
          <AlertCircle size={16} />
          <span>{stage.error}</span>
        </div>
      )}

      {stage.stage_number === 4 && stage.status === 'completed' && slots && slots.length > 0 && (
        <div className="booking-approval">
          <h4 className="booking-approval-title">Available Appointment Slots</h4>
          <p className="booking-approval-desc">
            Please select a slot and confirm to proceed with booking your appointment.
          </p>
          <div className="slot-list">
            {slots.map(slot => (
              <label key={slot.id} className={`slot-item ${selectedSlot === slot.id ? 'slot-selected' : ''}`}>
                <input
                  type="radio"
                  name="slot"
                  value={slot.id}
                  checked={selectedSlot === slot.id}
                  onChange={() => setSelectedSlot(slot.id)}
                  className="slot-radio"
                />
                <div className="slot-details">
                  <p className="slot-authority">{slot.authority_name}</p>
                  <p className="slot-meta">
                    {formatDateDisplay(slot.date)} · {slot.time_slot} · {prettifyMode(slot.mode)}
                  </p>
                  {slot.location && <p className="slot-loc">{slot.location}</p>}
                </div>
              </label>
            ))}
          </div>
          <button
            className="booking-confirm-btn"
            disabled={!selectedSlot || bookingLoading}
            onClick={() => onApproveBooking(selectedSlot)}
          >
            {bookingLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Booking…</>
            ) : (
              <>Confirm Appointment</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Local stage panel (shown when no backend) ─────────────────────────────────

const LocalStagePanel: React.FC<{ form: ApplicationFormState }> = ({ form }) => {
  const eligCat = prettifyValue(form.eligibility.eligibility_category);
  const subtasks = [
    { id: '1', label: 'Request logged', description: 'Your legal aid request has been recorded in our system.', status: 'completed' as StageStatus, completed_at: new Date().toISOString() },
    { id: '2', label: 'Searching for relevant authorities', description: `Looking for legal aid authorities in ${form.location.state || 'your state'}.`, status: 'in_progress' as StageStatus },
  ];

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-icon-wrap">
          <MapPin size={22} />
        </div>
        <div className="stage-panel-title-block">
          <h3 className="stage-panel-title">Step 2: Finding Relevant Services</h3>
          <p className="stage-panel-desc">
            We are searching for relevant legal aid authorities and services based on your location and issue type.
          </p>
        </div>
        <StatusBadge status="in_progress" />
      </div>

      <div className="stage-subtasks">
        {subtasks.map(t => (
          <SubTaskRow
            key={t.id}
            label={t.label}
            description={t.description}
            status={t.status}
            completedAt={t.completed_at}
          />
        ))}
        <SubTaskRow
          key="3"
          label="Verifying eligibility criteria"
          description={`Checking eligibility for category: ${eligCat}`}
          status="pending"
        />
      </div>
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onGoToForm: () => void }> = ({ onGoToForm }) => (
  <div className="appt-status-empty">
    <div className="empty-icon-wrap">
      <ClipboardList size={40} />
    </div>
    <h2 className="empty-title">No Request Found</h2>
    <p className="empty-desc">
      You haven't submitted a legal aid request yet. Complete the form to get started — we'll
      track the progress of your request here.
    </p>
    <button className="btn-primary empty-btn" onClick={onGoToForm}>
      Start Your Request
    </button>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const AppointmentStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const requestId = loadRequestId();
  const localData = loadSubmittedForm();

  const [data, setData] = useState<LegalAidRequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!requestId) { setLoading(false); return; }
    try {
      const result = await getRequestStatus(requestId);
      setData(result);
      setError(null);
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchStatus();
    if (requestId) {
      pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus, requestId]);

  const handleApproveBooking = async (slotId: string) => {
    if (!requestId) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      await approveBooking(requestId, slotId);
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      setBookingError(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────

  // No requestId but have local form data → show local status page
  if (!loading && !requestId && localData) {
    const { form, submittedAt, localRequestId } = localData;
    return (
      <div className="appt-status-root">
        <StepNav activeStep={0} />

        <div className="appt-status-header">
          <h1 className="appt-status-title">Appointment Status</h1>
          <p className="appt-status-subtitle">
            Track the progress of your legal aid request. We will keep this page updated as we
            search, verify and book your appointment.
          </p>
        </div>

        <div className="appt-status-layout">
          <div className="appt-status-main">
            {/* Request ID card */}
            <div className="request-id-card">
              <div className="request-id-left">
                <div className="request-id-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="request-id-label">Request ID: <strong>{localRequestId}</strong></p>
                  <p className="request-id-sub">Submitted on {formatTs(submittedAt)}</p>
                </div>
              </div>
              <div className="request-id-right">
                <StatusBadge status="in_progress" />
                <p className="request-id-updated">Last updated: {formatTs(submittedAt)}</p>
              </div>
            </div>

            {/* Progress tracker */}
            <LocalProgressTracker submittedAt={submittedAt} />

            {/* Current stage panel */}
            <LocalStagePanel form={form} />
          </div>

          {/* Sidebar */}
          <LocalRequestSummary form={form} onEdit={() => navigate('/app/location')} />
        </div>
      </div>
    );
  }

  // No request at all
  if (!loading && !requestId && !localData) {
    return (
      <div className="appt-status-root">
        <StepNav activeStep={0} />
        <EmptyState onGoToForm={() => navigate('/app/location')} />
      </div>
    );
  }

  // Initial load
  if (loading && !data) {
    return (
      <div className="appt-status-root">
        <StepNav activeStep={0} />
        <div className="appt-status-loading">
          <Loader2 size={32} className="animate-spin" />
          <p>Loading your request status…</p>
        </div>
      </div>
    );
  }

  // Error with no prior data — fall back to local form data if available
  if (error && !data) {
    if (localData) {
      const { form, submittedAt, localRequestId } = localData;
      return (
        <div className="appt-status-root">
          <StepNav activeStep={0} />
          <div className="appt-status-header">
            <h1 className="appt-status-title">Appointment Status</h1>
            <p className="appt-status-subtitle">
              Track the progress of your legal aid request. We will keep this page updated as we
              search, verify and book your appointment.
            </p>
          </div>
          <div className="appt-status-layout">
            <div className="appt-status-main">
              <div className="request-id-card">
                <div className="request-id-left">
                  <div className="request-id-icon"><FileText size={20} /></div>
                  <div>
                    <p className="request-id-label">Request ID: <strong>{localRequestId}</strong></p>
                    <p className="request-id-sub">Submitted on {formatTs(submittedAt)}</p>
                  </div>
                </div>
                <div className="request-id-right">
                  <StatusBadge status="in_progress" />
                  <p className="request-id-updated">Last updated: {formatTs(submittedAt)}</p>
                </div>
              </div>
              <div className="status-stale-banner">
                <AlertCircle size={14} />
                <span>Could not connect to server: {error}</span>
                <button onClick={fetchStatus}><RefreshCw size={13} /> Retry</button>
              </div>
              <LocalProgressTracker submittedAt={submittedAt} />
              <LocalStagePanel form={form} />
            </div>
            <LocalRequestSummary form={form} onEdit={() => navigate('/app/location')} />
          </div>
        </div>
      );
    }
    return (
      <div className="appt-status-root">
        <StepNav activeStep={0} />
        <div className="appt-status-error-state">
          <AlertCircle size={32} />
          <h2>Could not load status</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchStatus}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeStage = data.stages.find(s => s.stage_number === data.current_stage)
    ?? data.stages[data.stages.length - 1];

  return (
    <div className="appt-status-root">
      <StepNav activeStep={0} />

      <div className="appt-status-header">
        <h1 className="appt-status-title">Appointment Status</h1>
        <p className="appt-status-subtitle">
          Track the progress of your legal aid request. We will keep this page updated as we
          search, verify and book your appointment.
        </p>
      </div>

      <div className="appt-status-layout">
        <div className="appt-status-main">
          <div className="request-id-card">
            <div className="request-id-left">
              <div className="request-id-icon">
                <FileText size={20} />
              </div>
              <div>
                <p className="request-id-label">Request ID: <strong>{data.request_id}</strong></p>
                <p className="request-id-sub">Submitted on {formatTs(data.created_at)}</p>
              </div>
            </div>
            <div className="request-id-right">
              <StatusBadge status={data.status} />
              <p className="request-id-updated">Last updated: {formatTs(data.updated_at)}</p>
            </div>
          </div>

          {error && data && (
            <div className="status-stale-banner">
              <AlertCircle size={14} />
              <span>Could not refresh: {error}</span>
              <button onClick={fetchStatus}><RefreshCw size={13} /> Retry</button>
            </div>
          )}

          <ProgressTracker stages={data.stages} currentStage={data.current_stage} />

          {bookingError && (
            <div className="booking-error-banner">
              <AlertCircle size={15} />
              <span>{bookingError}</span>
            </div>
          )}

          {activeStage && (
            <CurrentStagePanel
              stage={activeStage}
              slots={data.available_slots}
              onApproveBooking={handleApproveBooking}
              bookingLoading={bookingLoading}
            />
          )}
        </div>

        <RequestSummary data={data} onEdit={() => navigate('/app/location')} />
      </div>
    </div>
  );
};
