import React from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  'Confirmed': 'bg-green-100 text-green-800 border-green-200',
  'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
  'Awaiting User Action': 'bg-sky-100 text-sky-800 border-sky-200',
  'Pending Confirmation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Needs Verification': 'bg-red-100 text-red-800 border-red-200',
  'Stopped – Fee Detected': 'bg-red-200 text-red-900 border-red-300',
  'Not Eligible': 'bg-stone-200 text-stone-700 border-stone-300',
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => (
  <span
    className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-semibold leading-tight text-center ${
      STATUS_STYLES[status] ?? 'bg-stone-100 text-stone-700 border-stone-200'
    } ${className}`}
  >
    {status}
  </span>
);

export const UrgentTag: React.FC = () => (
  <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-[0.65rem] font-bold uppercase tracking-wide">
    <Clock3 size={10} /> Urgent
  </span>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({
  title, subtitle, right,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div>
      <h1 className="text-3xl font-serif font-semibold text-olive-800">{title}</h1>
      {subtitle && <p className="text-sm text-bark-500 mt-1 max-w-xl">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Panel: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title, action, className = '', children,
}) => (
  <section className={`bg-ivory-100 border border-khaki-100 rounded-2xl shadow-card ${className}`}>
    {title && (
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-olive-800 tracking-wide">{title}</h2>
        {action}
      </header>
    )}
    <div className="px-5 pb-4 pt-2">{children}</div>
  </section>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
    <div className="flex-1">{message}</div>
    {onRetry && (
      <button onClick={onRetry} className="font-semibold underline">Retry</button>
    )}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <p className="py-10 text-center text-sm text-bark-400" role="status">{label}</p>
);

export function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  });
}

export function plainDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold text-olive-800 bg-ivory-300">
          {headers.map((h, i) => (
            <th key={h} className={`px-4 py-3 ${i === 0 ? 'rounded-tl-xl' : ''} ${i === headers.length - 1 ? 'rounded-tr-xl' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-khaki-100">{children}</tbody>
    </table>
  </div>
);
