import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import PayuPayButton from '../components/PayuPayButton';
import PaymentReturnNotice from '../components/PaymentReturnNotice';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import { formatPaise } from '../utils/payuCheckout';

// Absolute URL for a file served from the backend's /uploads folder
const uploadHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const METHOD_LABELS = { checkout: 'Website', payment_link: 'Payment link' };

const StudentPaymentsPage = () => {
  const [payables, setPayables] = useState({ enabled: true, message: '', items: [] });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState('');

  const load = useCallback(async () => {
    const [payableRes, paymentRes] = await Promise.all([
      api.get('/online-payments/payables'),
      api.get('/online-payments/mine'),
    ]);
    setPayables(payableRes.data);
    setPayments(paymentRes.data);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not load your payments');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (error) {
      toast.error('Could not refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const checkStatus = async (payment) => {
    setSyncing(payment._id);
    try {
      const { data } = await api.get(`/online-payments/${payment._id}`, { params: { sync: 'true' } });
      setPayments((list) => list.map((item) => (item._id === data._id ? { ...item, ...data } : item)));
      if (data.syncError) toast.error(data.syncError);
      else if (data.status === 'paid') {
        toast.success('Payment confirmed');
        await load();
      } else toast(`Status: ${data.status}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not check the status');
    } finally {
      setSyncing('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-iiae-gold border-t-transparent" />
      </div>
    );
  }

  const dueItems = payables.items.filter((item) => item.payable);
  const settledItems = payables.items.filter((item) => !item.payable);

  const dueTotal = dueItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Payments</h1>
          <p className="mt-0.5 text-xs text-slate-500">Pay fees through PayU and keep a record of every payment.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="btn-outline disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <PaymentReturnNotice onPaid={() => load().catch(() => {})} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due now</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{dueItems.length}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">{dueItems.length === 1 ? 'Fee waiting' : 'Fees waiting'}</p>
        </div>
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount due</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{dueItems.length ? formatPaise(dueTotal, dueItems[0].currency) : '—'}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">{payables.enabled ? 'Payable online' : 'Online pay is off'}</p>
        </div>
        <div className="glass-card col-span-2 px-4 py-3 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payments</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{payments.length}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">On this account</p>
        </div>
      </div>

      {!payables.enabled && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {payables.message || 'Online payments are not available right now. Please contact the accounts office.'}
        </div>
      )}

      <section className="glass-card">
        <h2 className="student-panel-head">Fees due</h2>
        <div className="px-4 py-4">
          {dueItems.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing is due right now.</p>
          ) : (
            <div className="space-y-2">
              {dueItems.map((item) => (
                <div key={item.type} className="flex flex-col gap-3 border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatPaise(item.amount, item.currency)}</p>
                  </div>
                  {payables.enabled && (
                    <PayuPayButton payableType={item.type} label="Pay now" className="btn-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
          {settledItems.length > 0 && (
            <ul className={`space-y-2 ${dueItems.length ? 'mt-4 border-t border-slate-100 pt-4' : ''}`}>
              {settledItems.map((item) => (
                <li key={item.type} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="text-slate-500">{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <h2 className="student-panel-head">Payment history</h2>
        {payments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">You have not made any online payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  <th className="px-4">Date</th>
                  <th className="px-4">Fee</th>
                  <th className="px-4">Reference</th>
                  <th className="px-4">Via</th>
                  <th className="px-4 text-right">Amount</th>
                  <th className="px-4">Status</th>
                  <th className="px-4"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-4 text-slate-600">{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                    <td className="px-4 font-medium text-slate-900">{payment.description}</td>
                    <td className="px-4 font-mono text-xs text-slate-500">
                      {payment.reference}
                      {payment.payuPaymentId && <div>PayU {payment.payuPaymentId}</div>}
                    </td>
                    <td className="px-4 text-slate-600">{METHOD_LABELS[payment.method] || payment.method}</td>
                    <td className="px-4 text-right font-semibold tabular-nums text-slate-900">{formatPaise(payment.amount, payment.currency)}</td>
                    <td className="px-4"><PaymentStatusBadge status={payment.status} /></td>
                    <td className="px-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {uploadHref(payment.invoiceUrl) && (
                          <a href={uploadHref(payment.invoiceUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-iiae-gold hover:underline">
                            <FileText className="h-3.5 w-3.5" /> Invoice
                          </a>
                        )}
                        {['created', 'pending'].includes(payment.status) && (
                          <button type="button" onClick={() => checkStatus(payment)} disabled={syncing === payment._id} className="text-xs font-semibold text-iiae-gold hover:underline disabled:opacity-60">
                            {syncing === payment._id ? 'Checking...' : 'Check status'}
                          </button>
                        )}
                        {payment.status === 'created' && payment.method === 'payment_link' && payment.paymentUrl && (
                          <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-iiae-gold hover:underline">Open link</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentPaymentsPage;
