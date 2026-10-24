import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Check, Clock3, X, AlertTriangle, User, Phone, Mail, MapPin, FileText, Users as UsersIcon,
  CalendarDays, Building2, Pencil, StickyNote, ShieldAlert, History, Loader2,
} from 'lucide-react';
import {
  adminApi, adminErrorMessage, type AdminDetail, type AdminStage, type AdminUpdate,
} from '../../services/adminApi';
import { ErrorBox, Loading, Panel, StatusBadge, fmtDate, plainDate } from '../../components/admin/ui';

const STEP_LABELS = ['Submitted', 'Finding Services', 'Eligibility Verified', 'Fetching Slots', 'Booking Appointment', 'Confirmation'];

const StepDot: React.FC<{ stage: AdminStage }> = ({ stage }) => {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold';
  switch (stage.status) {
    case 'completed': return <span className={`${base} bg-olive-500 border-olive-500 text-white`}><Check size={15} /></span>;
    case 'failed': return <span className={`${base} bg-red-600 border-red-600 text-white`}><X size={15} /></span>;
    case 'awaiting_approval': return <span className={`${base} bg-sky-500 border-sky-500 text-white`}><Clock3 size={14} /></span>;
    case 'in_progress': return <span className={`${base} bg-amber-400 border-amber-400 text-olive-800`}><Loader2 size={14} className="animate-spin" /></span>;
    default: return <span className={`${base} bg-ivory-100 border-khaki-200 text-bark-400`}>{stage.stage_number}</span>;
  }
};

const STAGE_STATUS_TEXT: Record<string, string> = {
  completed: 'Completed', failed: 'Stopped', awaiting_approval: 'Awaiting applicant approval',
  in_progress: 'In progress', pending: 'Not started',
};

const Row: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-start gap-2.5 py-1.5 text-sm">
    <span className="text-bark-400 mt-0.5 shrink-0">{icon}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

export const AdminApplicationDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const [data, setData] = useState<AdminDetail | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [noteDraft, setNoteDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [feeDraft, setFeeDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [applicantDraft, setApplicantDraft] = useState({ name: '', mobile: '', email: '' });

  const hydrate = (d: AdminDetail) => {
    setData(d);
    setNoteDraft(d.notes);
    setStatusDraft('');
    setApplicantDraft({ name: d.applicant.name, mobile: d.applicant.mobile, email: d.applicant.email });
  };

  const load = useCallback(async () => {
    setError('');
    try { hydrate(await adminApi.detail(id)); }
    catch (e) { setError(adminErrorMessage(e, 'Could not load this application.')); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = async (body: AdminUpdate, success: string) => {
    setSaving(true);
    try {
      hydrate(await adminApi.update(id, body));
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(adminErrorMessage(e, 'Could not save the change.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <>
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-bark-500 mb-4"><ArrowLeft size={15} /> Back to Applications</Link>
      <ErrorBox message={error} onRetry={load} />
    </>
  );
  if (!data) return <Loading />;

  const activeStage = data.stages.find((s) => s.status !== 'completed') ?? data.stages[data.stages.length - 1];
  const shown = data.stages.find((s) => s.stage_number === (selected ?? activeStage.stage_number)) ?? activeStage;
  const stopped = data.flags.fee_detected;
  const booked = data.booking_confirmation && data.status === 'Confirmed';

  return (
    <>
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-olive-800 mb-3">
        <ArrowLeft size={15} /> Back to Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-olive-800">Application Details</h1>
          <p className="text-sm text-bark-500 mt-1">View complete details, track progress and manage the appointment status.</p>
        </div>
        <StatusBadge status={data.status} className="!text-sm !px-4 !py-2" />
      </div>

      {(data.flags.is_urgent || stopped || data.service.match_status === 'unverified') && (
        <div className="space-y-2 mb-5" aria-label="Flags">
          {data.flags.is_urgent && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              <Clock3 size={18} className="mt-0.5 shrink-0" />
              <div><strong>Urgent:</strong> {data.flags.urgent_reason || 'Flagged urgent'}. Prioritise finding qualified assistance.</div>
            </div>
          )}
          {stopped && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-sm text-red-900">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <div><strong>Booking stopped:</strong> an unexpected fee was detected{data.flags.fee_details ? ` — ${data.flags.fee_details}` : ''}. Nothing proceeds until staff review it.</div>
            </div>
          )}
          {data.service.match_status === 'unverified' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div><strong>Service unverified:</strong> {data.service.name || 'The selected service'} was not found in the service catalogue. A person must verify it.</div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* ── Left column ── */}
        <div className="space-y-5 min-w-0">
          <Panel>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ['Request ID', data.request_id],
                ['Applicant Name', data.applicant.name || '—'],
                ['Submitted On', fmtDate(data.created_at, true)],
                ['Last Updated', fmtDate(data.updated_at, true)],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-bark-400">{k}</dt><dd className="font-semibold text-olive-800 mt-0.5">{v}</dd></div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <div className="overflow-x-auto">
            <ol className="grid grid-cols-6 gap-1 pt-1 min-w-[560px]" aria-label="Progress">
              {data.stages.map((s, i) => (
                <li key={s.stage_number} className="relative flex flex-col items-center text-center">
                  {i > 0 && (
                    <span aria-hidden className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${
                      data.stages[i - 1].status === 'completed' ? 'bg-olive-500' : 'bg-khaki-200'}`} />
                  )}
                  <button onClick={() => setSelected(s.stage_number)} className="relative z-10 rounded-full focus-visible:outline-2"
                    aria-label={`Step ${s.stage_number}: ${STEP_LABELS[i]} – ${STAGE_STATUS_TEXT[s.status]}`}>
                    <StepDot stage={s} />
                  </button>
                  <span className="text-[0.7rem] font-semibold text-olive-800 mt-2 leading-tight">{s.stage_number}. {STEP_LABELS[i]}</span>
                  <span className="text-[0.65rem] text-bark-400 mt-0.5">{s.completed_at ? fmtDate(s.completed_at, true) : STAGE_STATUS_TEXT[s.status]}</span>
                </li>
              ))}
            </ol>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-xl text-olive-800">Step {shown.stage_number}: {STEP_LABELS[shown.stage_number - 1]}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                shown.status === 'completed' ? 'bg-green-100 text-green-800'
                : shown.status === 'failed' ? 'bg-red-100 text-red-800'
                : shown.status === 'awaiting_approval' ? 'bg-sky-100 text-sky-800'
                : 'bg-amber-100 text-amber-800'}`}>
                {STAGE_STATUS_TEXT[shown.status]}
              </span>
            </div>
            {shown.error && <p className="text-sm text-red-700 mb-2">{shown.error}</p>}
            <ul className="divide-y divide-khaki-100">
              {shown.subtasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    t.status === 'completed' ? 'bg-olive-500 text-white' : t.status === 'failed' ? 'bg-red-600 text-white' : 'border border-khaki-200'}`}>
                    {t.status === 'completed' && <Check size={12} />}{t.status === 'failed' && <X size={12} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-olive-800">{t.label}</p>
                    {t.description && <p className="text-xs text-bark-400">{t.description}</p>}
                  </div>
                  <span className="text-xs text-bark-400 whitespace-nowrap">{t.completed_at ? fmtDate(t.completed_at, true) : ''}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Honest booking outcome */}
          {booked && data.booking_confirmation ? (
            <div className="rounded-2xl border border-green-300 bg-green-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <Check className="text-white bg-olive-500 rounded-full p-1" size={26} />
                <div>
                  <p className="font-semibold text-olive-800">Appointment Confirmed</p>
                  <p className="text-xs text-bark-500">Booking record and date verified on the portal.</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                {[
                  ['Appointment ID', data.booking_confirmation.confirmation_number],
                  ['Date & Time', `${plainDate(data.booking_confirmation.date)}, ${data.booking_confirmation.time_slot}`],
                  ['Mode', data.booking_confirmation.mode.replace(/_/g, ' ')],
                  ['Authority', data.booking_confirmation.authority_name],
                ].map(([k, v]) => <div key={k}><dt className="text-xs text-bark-400">{k}</dt><dd className="font-semibold text-olive-800">{v}</dd></div>)}
              </dl>
            </div>
          ) : (
            <div className={`rounded-2xl border px-5 py-4 text-sm ${
              stopped ? 'border-red-300 bg-red-50 text-red-900'
              : data.status === 'Pending Confirmation' ? 'border-orange-300 bg-orange-50 text-orange-900'
              : 'border-khaki-100 bg-ivory-100 text-bark-600'}`}>
              <p className="font-semibold">
                {stopped ? 'Booking stopped' : data.status === 'Pending Confirmation' ? 'Booking pending — not confirmed' : 'No confirmed appointment'}
              </p>
              <p className="mt-1">
                {stopped
                  ? 'The booking was stopped because of an unexpected fee.'
                  : data.status === 'Pending Confirmation'
                    ? 'The portal has received the request but has not confirmed it. No lawyer has been assigned.'
                    : 'No appointment has been confirmed on the portal yet. No lawyer has been assigned.'}
              </p>
            </div>
          )}

          <Panel title="Audit trail" action={<History size={15} className="text-bark-400" />}>
            {data.audit.length === 0 ? <p className="text-sm text-bark-400">No events recorded.</p> : (
              <ol className="space-y-3">
                {data.audit.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-olive-300 mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p><strong className="text-olive-800">{e.action.replace(/_/g, ' ')}</strong> <span className="text-bark-400">· {e.actor} · {fmtDate(e.at, true)}</span></p>
                      {e.detail && <p className="text-bark-500 text-xs break-words">{e.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          <Panel title="Applicant Information" action={
            !editing
              ? <button onClick={() => setEditing(true)} className="text-xs text-bark-500 flex items-center gap-1"><Pencil size={12} /> Edit</button>
              : null}>
            {editing ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (await save({ full_name: applicantDraft.name, mobile_number: applicantDraft.mobile, email: applicantDraft.email }, 'Applicant details updated')) setEditing(false);
              }} className="space-y-2">
                {(['name', 'mobile', 'email'] as const).map((k) => (
                  <input key={k} aria-label={k} value={applicantDraft[k]} type={k === 'email' ? 'email' : 'text'}
                    onChange={(e) => setApplicantDraft({ ...applicantDraft, [k]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-khaki-200 bg-white text-sm" />
                ))}
                <div className="flex gap-2 pt-1">
                  <button disabled={saving} className="px-3 py-1.5 rounded-lg bg-olive-500 text-white text-xs font-semibold disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => { setEditing(false); hydrate(data); }} className="px-3 py-1.5 rounded-lg border border-khaki-200 text-xs">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <Row icon={<User size={15} />}>{data.applicant.name || '—'}</Row>
                <Row icon={<Phone size={15} />}>{data.applicant.mobile || '—'}</Row>
                <Row icon={<Mail size={15} />}>{data.applicant.email || '—'}</Row>
              </>
            )}
          </Panel>

          <Panel title="Request Details">
            <Row icon={<MapPin size={15} />}>{[...new Set([data.request.city, data.request.district, data.request.state].filter(Boolean))].join(', ') || '—'}{data.request.pin_code && ` – ${data.request.pin_code}`}</Row>
            <Row icon={<FileText size={15} />}>{data.request.issue_type || '—'}</Row>
            {data.request.description && <p className="text-xs text-bark-500 pl-7 pb-1">{data.request.description}</p>}
            <Row icon={<UsersIcon size={15} />}>{data.request.eligibility_category || '—'}</Row>
            {data.request.court_deadline && <Row icon={<Clock3 size={15} />}>Court deadline: {plainDate(data.request.court_deadline)}</Row>}
          </Panel>

          <Panel title="Appointment Details">
            <Row icon={<CalendarDays size={15} />}>{plainDate(data.appointment.preferred_date)} <span className="text-bark-400">(preferred)</span></Row>
            <Row icon={<Clock3 size={15} />}>{data.appointment.preferred_time_slot || '—'}</Row>
            <Row icon={<MapPin size={15} />}>{(data.appointment.mode || '—').replace('_', ' ')}</Row>
            <Row icon={<Building2 size={15} />}>{data.service.name || data.booking_confirmation?.authority_name || 'No service selected yet'}</Row>
            {data.service.review_reference && <p className="text-xs text-bark-400 pl-7">Review ref: {data.service.review_reference}</p>}
          </Panel>

          <Panel title="Staff Actions" action={<ShieldAlert size={15} className="text-bark-400" />}>
            <label className="block text-xs text-bark-400 mb-1" htmlFor="status-select">Set status</label>
            <div className="flex gap-2">
              <select id="status-select" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} disabled={stopped}
                className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-khaki-200 bg-white text-sm disabled:opacity-50">
                <option value="">Automatic ({data.status})</option>
                {data.assignable_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button disabled={saving || stopped} onClick={() => save({ admin_status: statusDraft || null }, 'Status updated')}
                className="px-3 rounded-lg bg-olive-500 text-white text-xs font-semibold disabled:opacity-50">Apply</button>
            </div>
            {stopped && <p className="text-xs text-red-700 mt-1">Clear the fee flag before changing status.</p>}

            <div className="mt-4 pt-3 border-t border-khaki-100">
              {stopped ? (
                <button disabled={saving} onClick={() => save({ fee_detected: false }, 'Fee flag cleared')}
                  className="w-full py-2 rounded-lg border border-khaki-200 text-sm font-medium hover:bg-ivory-200">Clear fee flag (fee resolved)</button>
              ) : (
                <>
                  <input aria-label="Fee details" value={feeDraft} onChange={(e) => setFeeDraft(e.target.value)} placeholder="Fee details (e.g. ₹500 consultation fee)"
                    className="w-full px-3 py-2 rounded-lg border border-khaki-200 bg-white text-sm mb-2" />
                  <button disabled={saving || !feeDraft.trim()} onClick={() => save({ fee_detected: true, fee_details: feeDraft.trim() }, 'Booking stopped – fee flagged')}
                    className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-40">Flag unexpected fee &amp; stop booking</button>
                </>
              )}
              <button disabled={saving} onClick={() => save({ is_urgent: !data.flags.is_urgent }, data.flags.is_urgent ? 'Urgent flag removed' : 'Marked urgent')}
                className="w-full mt-2 py-2 rounded-lg border border-khaki-200 text-sm font-medium hover:bg-ivory-200">
                {data.flags.is_urgent ? 'Remove urgent flag' : 'Mark as urgent'}
              </button>
            </div>
          </Panel>

          <Panel title="Notes" action={<StickyNote size={15} className="text-bark-400" />}>
            <textarea aria-label="Staff notes" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4}
              className="w-full px-3 py-2 rounded-lg border border-khaki-200 bg-white text-sm" />
            {data.additional_notes && <p className="text-xs text-bark-400 mt-1">Applicant note: {data.additional_notes}</p>}
            <button disabled={saving || noteDraft === data.notes} onClick={() => save({ admin_notes: noteDraft }, 'Notes saved')}
              className="mt-2 px-3 py-1.5 rounded-lg bg-olive-500 text-white text-xs font-semibold disabled:opacity-40">Save notes</button>
          </Panel>
        </div>
      </div>
    </>
  );
};
