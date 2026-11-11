import React from 'react';
import { PAYMENT_STATUS_LABELS } from '../utils/payuCheckout';

const STYLES = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  created: 'bg-slate-50 text-slate-600 border-slate-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PaymentStatusBadge = ({ status, size = 'sm' }) => {
  const label = PAYMENT_STATUS_LABELS[status] || status || 'Unknown';
  const sizing = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px] uppercase tracking-wide';
  return (
    <span className={`inline-flex items-center rounded-full border font-bold ${sizing} ${STYLES[status] || STYLES.created}`}>
      {label}
    </span>
  );
};

export default PaymentStatusBadge;
