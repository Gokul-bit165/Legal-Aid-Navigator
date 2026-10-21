import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, adminErrorMessage } from '../../services/adminApi';
import { searchAuthorities, type Authority } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
import { ErrorBox, Loading, PageHeader, Panel, StatusBadge, Table, UrgentTag, fmtDate, plainDate } from '../../components/admin/ui';

/** Loads data once and exposes loading / error / retry — shared by the simple list pages. */
function useLoad<T>(fetcher: () => Promise<T>, fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData(await fetcher()); } catch (e) { setError(adminErrorMessage(e, fallback)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { data, error, load };
}

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-ivory-100 border border-khaki-100 rounded-2xl shadow-card p-3">{children}</div>
);

export const AdminUsersPage: React.FC = () => {
  const { data, error, load } = useLoad(adminApi.users, 'Could not load users.');
  return (
    <>
      <PageHeader title="Users" subtitle="Applicants and staff who have an account." />
      {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Loading /> : (
        <Card>
          <Table headers={['Name', 'Username', 'Email', 'Role', 'Applications', 'Joined']}>
            {data.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-olive-800">{u.full_name || '—'}</td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3 text-bark-500">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">{u.applications}</td>
                <td className="px-4 py-3 whitespace-nowrap text-bark-500">{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
};

export const AdminAppointmentsPage: React.FC = () => {
  const { data, error, load } = useLoad(adminApi.appointments, 'Could not load appointments.');
  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Requested dates and times. Only applications marked Confirmed have a confirmed appointment."
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Loading /> : (
        <Card>
          <Table headers={['Request ID', 'Applicant', 'Date', 'Time', 'Mode', 'Location', 'Status']}>
            {data.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium"><Link to={`/admin/applications/${a.id}`} className="text-olive-500 underline">{a.request_id}</Link></td>
                <td className="px-4 py-3">{a.applicant_name}{a.is_urgent && <UrgentTag />}</td>
                <td className="px-4 py-3 whitespace-nowrap">{plainDate(a.date)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.time_slot}</td>
                <td className="px-4 py-3 capitalize">{a.mode.replace('_', ' ')}</td>
                <td className="px-4 py-3">{a.location}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </Table>
          {data.length === 0 && <p className="py-8 text-center text-sm text-bark-400">No appointments yet.</p>}
        </Card>
      )}
    </>
  );
};

export const AdminAuthoritiesPage: React.FC = () => {
  const { data, error, load } = useLoad<{ authorities: Authority[]; total: number }>(
    () => searchAuthorities(), 'Could not load authorities.',
  );
  return (
    <>
      <PageHeader title="Authorities" subtitle="Legal services authorities in the reference directory. Verify details against the official site before relying on them." />
      {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Loading /> : (
        <Card>
          <Table headers={['Authority', 'State', 'District', 'Phone', 'Email', 'Hours']}>
            {data.authorities.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-olive-800">
                  {a.website ? <a className="underline" href={a.website} target="_blank" rel="noreferrer">{a.name}</a> : a.name}
                </td>
                <td className="px-4 py-3">{a.state}</td>
                <td className="px-4 py-3">{a.district}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.phone}</td>
                <td className="px-4 py-3 text-bark-500">{a.email}</td>
                <td className="px-4 py-3 text-bark-500">{a.hours}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
};

const Bars: React.FC<{ title: string; data: Record<string, number> }> = ({ title, data }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <Panel title={title}>
      {entries.length === 0 ? <p className="text-sm text-bark-400">No data.</p> : (
        <ul className="space-y-2">
          {entries.map(([k, v]) => (
            <li key={k} className="text-sm">
              <div className="flex justify-between"><span>{k}</span><span className="font-semibold text-olive-800">{v}</span></div>
              <div className="h-2 rounded bg-ivory-300 mt-1"><div className="h-2 rounded bg-olive-400" style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export const AdminReportsPage: React.FC = () => {
  const { data, error, load } = useLoad(adminApi.reports, 'Could not load reports.');
  return (
    <>
      <PageHeader title="Reports" subtitle="Where applications stand and where staff attention is needed." />
      {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              ['Total applications', data.total], ['Urgent', data.urgent],
              ['Stopped (fee detected)', data.fee_stopped], ['Unverified service', data.unverified_service],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-khaki-100 bg-ivory-300 px-5 py-4 text-center">
                <p className="text-3xl font-semibold text-olive-800">{v}</p>
                <p className="text-sm mt-1">{k}</p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Bars title="By status" data={data.by_status} />
            <Bars title="By legal issue" data={data.by_issue} />
            <Bars title="By district" data={data.by_district} />
          </div>
        </>
      )}
    </>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  useEffect(() => {
    fetch(`${API_BASE_URL}/`).then((r) => setHealth(r.ok ? 'ok' : 'down')).catch(() => setHealth('down'));
  }, []);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and the services this portal depends on." />
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Signed in as">
          <p className="text-sm"><strong className="text-olive-800">{user?.full_name || user?.username}</strong> · Administrator</p>
          <p className="text-sm text-bark-500">{user?.email}</p>
        </Panel>
        <Panel title="Backend API">
          <p className="text-sm">
            {API_BASE_URL} — {health === 'checking' ? 'checking…' : health === 'ok'
              ? <span className="text-green-700 font-semibold">reachable</span>
              : <span className="text-red-700 font-semibold">not reachable</span>}
          </p>
        </Panel>
      </div>
    </>
  );
};
