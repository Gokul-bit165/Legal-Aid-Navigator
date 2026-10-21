import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarRange, FileText, CheckCircle2, Clock, XCircle, Search, Eye } from 'lucide-react';
import { adminApi, adminErrorMessage, type AdminList, type AdminStats } from '../../services/adminApi';
import { ErrorBox, Loading, PageHeader, StatusBadge, Table, UrgentTag, fmtDate } from '../../components/admin/ui';

const PAGE_SIZE = 8;

const Tile: React.FC<{ icon: React.ReactNode; value: number | string; label: string; tone: string }> = ({
  icon, value, label, tone,
}) => (
  <div className={`rounded-2xl border px-5 py-4 flex flex-col items-center text-center ${tone}`}>
    <div className="flex items-center gap-2 text-3xl font-semibold text-olive-800">{icon}{value}</div>
    <p className="text-sm font-medium mt-1">{label}</p>
  </div>
);

export const AdminApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [issue, setIssue] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [list, setList] = useState<AdminList | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const range = { date_from: from || undefined, date_to: to || undefined };
      const [s, l] = await Promise.all([
        adminApi.stats(range),
        adminApi.list({
          search: debounced, status: status || undefined, issue: issue || undefined,
          ...range, page, page_size: PAGE_SIZE,
        }),
      ]);
      setStats(s);
      setList(l);
    } catch (e) {
      setError(adminErrorMessage(e, 'Could not load applications.'));
    } finally {
      setLoading(false);
    }
  }, [debounced, status, issue, from, to, page]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const totalPages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;
  const shownFrom = list && list.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const shownTo = list ? Math.min(page * PAGE_SIZE, list.total) : 0;

  const resetFilters = () => { setSearch(''); setStatus(''); setIssue(''); setFrom(''); setTo(''); setPage(1); };
  const filtered = !!(search || status || issue || from || to);

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="View and manage all legal aid applications, track their status and appointment progress."
        right={
          <div className="flex items-center gap-2 bg-ivory-100 border border-khaki-100 rounded-xl px-3 py-2 text-sm">
            <CalendarRange size={16} className="text-bark-400" />
            <input type="date" aria-label="From date" value={from} max={to || undefined}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="bg-transparent text-sm focus:outline-none" />
            <span className="text-bark-400">–</span>
            <input type="date" aria-label="To date" value={to} min={from || undefined}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="bg-transparent text-sm focus:outline-none" />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Tile icon={<FileText size={26} className="text-bark-400" />} value={stats?.total ?? '–'} label="Total Applications" tone="bg-ivory-300 border-khaki-100" />
        <Tile icon={<CheckCircle2 size={26} className="text-green-700" />} value={stats?.confirmed ?? '–'} label="Confirmed Appointments" tone="bg-green-50 border-green-200" />
        <Tile icon={<Clock size={26} className="text-amber-600" />} value={stats?.in_progress ?? '–'} label="In Progress" tone="bg-amber-50 border-amber-200" />
        <Tile icon={<XCircle size={26} className="text-red-600" />} value={stats?.needs_attention ?? '–'} label="Needs Attention" tone="bg-red-50 border-red-200" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex-1 min-w-[230px] relative">
          <span className="sr-only">Search applications</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, request ID, phone or email…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-khaki-100 bg-ivory-100 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
          />
        </label>
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-khaki-100 bg-ivory-100 text-sm">
          <option value="">All Statuses</option>
          {(list?.statuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by legal issue" value={issue} onChange={(e) => { setIssue(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-khaki-100 bg-ivory-100 text-sm max-w-[240px]">
          <option value="">All Legal Issues</option>
          {(list?.issue_types ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {filtered && (
          <button onClick={resetFilters} className="text-sm text-olive-500 underline px-1">Clear filters</button>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!error && (
        <div className="bg-ivory-100 border border-khaki-100 rounded-2xl shadow-card p-3">
          {loading && !list ? <Loading /> : (
            <>
              <Table headers={['Request ID', 'Applicant Name', 'Legal Issue', 'Location', 'Current Status', 'Submitted On', 'Actions']}>
                {list?.items.map((r) => (
                  <tr key={r.id} className="hover:bg-ivory-200 cursor-pointer" onClick={() => navigate(`/admin/applications/${r.id}`)}>
                    <td className="px-4 py-3 font-medium text-olive-800 whitespace-nowrap">{r.request_id}</td>
                    <td className="px-4 py-3">{r.applicant_name}{r.is_urgent && <UrgentTag />}</td>
                    <td className="px-4 py-3 max-w-[190px]">{r.legal_issue}</td>
                    <td className="px-4 py-3">{r.location}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-bark-500">{fmtDate(r.submitted_at, true)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/applications/${r.id}`); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-khaki-200 bg-white text-xs font-semibold text-olive-800 hover:bg-ivory-200"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>

              {list && list.items.length === 0 && (
                <p className="py-10 text-center text-sm text-bark-400">
                  {filtered ? 'No applications match these filters.' : 'No applications yet.'}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3">
                <p className="text-xs text-bark-500">
                  Showing {shownFrom} to {shownTo} of {list?.total ?? 0} applications
                </p>
                <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
                  <button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="p-2 rounded-lg border border-khaki-100 bg-white disabled:opacity-40"><ChevronLeft size={15} /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((n) => (
                    <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}
                      className={`w-8 h-8 rounded-lg text-sm font-medium border ${
                        n === page ? 'bg-olive-500 text-white border-olive-500' : 'bg-white border-khaki-100 text-bark-600'
                      }`}>{n}</button>
                  ))}
                  <button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-lg border border-khaki-100 bg-white disabled:opacity-40"><ChevronRight size={15} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
