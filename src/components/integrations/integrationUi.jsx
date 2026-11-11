import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Shared UI pieces used by every integration source (Meta, Google Ads, Google Sheet)

export const copyValue = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  } catch (error) {
    toast.error('Could not copy. Please select and copy the text manually.');
  }
};

// A value the admin has to paste into an external app, with a copy button
export const CopyRow = ({ label, value }) => (
  <div>
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 break-all border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-700">{value}</code>
      <button
        type="button"
        onClick={() => copyValue(value)}
        className="btn-outline h-8 shrink-0 px-2.5 text-[11px]"
      >
        <Copy className="h-3.5 w-3.5" /> Copy
      </button>
    </div>
  </div>
);

export const Panel = ({ title, action, children, footer, className = '', onSubmit }) => {
  const Tag = onSubmit ? 'form' : 'section';
  return (
    <Tag onSubmit={onSubmit} className={`glass-card flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {action}
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      {footer ? <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-2.5">{footer}</div> : null}
    </Tag>
  );
};

export const MetricCard = ({ label, value, detail, action, icon: Icon, tone }) => (
  <div className="glass-card flex min-w-0 items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {action}
      </div>
      <p className="mt-1 text-2xl font-semibold leading-none tabular-nums text-slate-900">{value}</p>
      <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500">{detail}</p>
    </div>
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

export const SpinnerPanel = () => (
  <div className="flex h-[calc(100vh-5.5rem)] items-center justify-center md:h-[calc(100vh-3rem)]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
  </div>
);

export const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path fill="#fff" d="M13.6 12.7h2.1l.3-2.3h-2.4V9.1c0-.7.2-1.1 1.2-1.1h1.3V6c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.1-3.2 3.2v1.3H8.7v2.3h2.3V19h2.6v-6.3z" />
  </svg>
);

export const GoogleAdsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#FBBC04" d="M4.2 16.8 9.6 7.4a3.2 3.2 0 0 1 5.5 3.2L9.7 20a3.2 3.2 0 0 1-5.5-3.2z" />
    <path fill="#4285F4" d="M14.8 8.2 19.6 16.6A3.2 3.2 0 0 1 14.1 20l-4.8-8.4a3.2 3.2 0 0 1 5.5-3.4z" />
    <circle cx="7.2" cy="17.6" r="2.5" fill="#34A853" />
  </svg>
);
