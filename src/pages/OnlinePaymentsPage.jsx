import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus, Search, X, Copy, Share2, MessageCircle, Mail, RefreshCw, Ban, ExternalLink, IndianRupee, ChevronLeft, ChevronRight, FileText, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import { formatPaise } from '../utils/payuCheckout';

// Absolute URL for a file served from the backend's /uploads folder
const uploadHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const PAYABLE_OPTIONS = [
  { value: 'registration_fee', label: 'Exam registration fee' },
  { value: 'tuition_fee', label: 'Course tuition fee balance' },
];

const METHOD_LABELS = { checkout: 'Website checkout', payment_link: 'Payment link' };

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }
};

const shareMessage = (payment) =>
  `Dear ${payment.student?.name || 'student'}, please pay ${formatPaise(payment.amount, payment.currency)} towards ${payment.description} at Indian Institute of Aircraft Engineering using this secure PayU link: ${payment.paymentUrl} (Reference ${payment.reference})`;

// Copy / WhatsApp / Email / native share buttons for one payment link
const ShareActions = ({ payment, compact = false }) => {
  if (!payment.paymentUrl) return null;
  const message = shareMessage(payment);
  const whatsappNumber = String(payment.student?.phone || '').replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${whatsappNumber ? (whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber) : ''}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${payment.student?.email || ''}?subject=${encodeURIComponent('Fee payment link - IIAE')}&body=${encodeURIComponent(message)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    const ok = await copyText(payment.paymentUrl);
    if (ok) toast.success('Link copied');
    else toast.error('Could not copy the link. Select it and copy manually.');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'IIAE fee payment link', text: message, url: payment.paymentUrl });
    } catch (error) {
      // User cancelled the share sheet
    }
  };

  const base = compact
    ? 'p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50';

  return (
    <div className={`flex flex-wrap items-center ${compact ? 'gap-0.5' : 'gap-2'}`}>
      <button type="button" onClick={copy} className={base} title="Copy link"><Copy className="w-4 h-4" />{!compact && 'Copy link'}</button>
      <a href={whatsappHref} target="_blank" rel="noreferrer" className={base} title="Share on WhatsApp"><MessageCircle className="w-4 h-4" />{!compact && 'WhatsApp'}</a>
      <a href={mailHref} className={base} title="Share by email"><Mail className="w-4 h-4" />{!compact && 'Email'}</a>
      {canNativeShare && <button type="button" onClick={nativeShare} className={base} title="Share"><Share2 className="w-4 h-4" />{!compact && 'Share'}</button>}
      <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className={base} title="Open link"><ExternalLink className="w-4 h-4" />{!compact && 'Open'}</a>
    </div>
  );
};

const OnlinePaymentsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [config, setConfig] = useState({ enabled: true, message: '' });
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, status: '', method: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [students, setStudents] = useState([]);
  const [busyId, setBusyId] = useState('');

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ studentId: '', payableType: 'registration_fee', expiresInDays: 7 });
  const [generated, setGenerated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.method) params.method = filters.method;
      if (filters.search) params.search = filters.search;
      const response = await api.get('/online-payments', { params });
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load online payments');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/online-payments/config').then((res) => setConfig(res.data)).catch(() => {});
    if (isAdmin) {
      api.get('/users?role=student').then((res) => setStudents(res.data)).catch(() => {});
    }
  }, [isAdmin]);

  const submitSearch = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() }));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);
    try {
      const response = await api.post('/online-payments/links', form);
      const payment = response.data.payment;
      const student = students.find((item) => item._id === form.studentId);
      setGenerated({ ...payment, student: student ? { name: student.name, email: student.email, phone: student.phone } : payment.student });
      toast.success(response.data.created ? 'Payment link created' : 'An active link for this fee already exists');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create the payment link');
    } finally {
      setGenerating(false);
    }
  };

  const syncPayment = async (payment) => {
    setBusyId(payment._id);
    try {
      const response = await api.get(`/online-payments/${payment._id}`, { params: { sync: 'true' } });
      if (response.data.syncError) toast.error(response.data.syncError);
      else toast.success(`Status: ${response.data.status}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not check the status');
    } finally {
      setBusyId('');
    }
  };

  const cancelLink = async (payment) => {
    setBusyId(payment._id);
    try {
      await api.post(`/online-payments/links/${payment._id}/cancel`);
      toast.success('Payment link cancelled');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not cancel the link');
    } finally {
      setBusyId('');
    }
  };

  const resendInvoice = async (payment) => {
    const email = payment.student?.email || 'the student';
    const notice = toast.loading(`Sending invoice to ${email}...`);
    setBusyId(payment._id);
    try {
      const response = await api.post(`/online-payments/${payment._id}/invoice/resend`);
      setData((current) => ({
        ...current,
        items: current.items.map((item) => (
          item._id === payment._id
            ? { ...item, ...response.data, student: item.student }
            : item
        )),
      }));
      toast.success(`Invoice emailed to ${email}`, { id: notice });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send the invoice', { id: notice });
    } finally {
      setBusyId('');
    }
  };

  const closeGenerate = () => {
    setIsGenerateOpen(false);
    setGenerated(null);
    setForm({ studentId: '', payableType: 'registration_fee', expiresInDays: 7 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-amber-500" /> Online Payments
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            PayU website checkouts and shareable payment links. Offline receipts stay under{' '}
            <Link to="/dashboard/payments" className="font-bold text-amber-600 hover:underline">Fees &amp; Payments</Link>.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsGenerateOpen(true)}
            disabled={!config.enabled}
            title={config.enabled ? '' : config.message}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
          >
            <Plus className="w-4.5 h-4.5" /> Generate Payment Link
          </button>
        )}
      </div>

      {!config.enabled && (
        <div className="bg-amber-50 p-4 text-xs font-semibold text-amber-800">
          {config.message}
        </div>
      )}

      <div className="glass-card p-4 flex flex-col lg:flex-row gap-3">
        <form onSubmit={submitSearch} className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by reference, order, payment or link id..."
            className="input-field pl-10"
          />
        </form>
        <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, page: 1, status: e.target.value }))} className="input-field lg:w-44">
          <option value="">All statuses</option>
          {['created', 'pending', 'paid', 'failed', 'expired', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filters.method} onChange={(e) => setFilters((c) => ({ ...c, page: 1, method: e.target.value }))} className="input-field lg:w-44">
          <option value="">All methods</option>
          <option value="checkout">Website checkout</option>
          <option value="payment_link">Payment link</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                <th className="p-4">Student</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center"><div className="w-6 h-6 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">No online payments yet</td></tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 align-top">
                    <td className="p-4">
                      {p.student?._id ? (
                        <Link to={`/dashboard/registrations/student/${p.student._id}`} className="font-bold text-slate-900 leading-tight capitalize hover:text-ame-orange">
                          {p.student.name}
                        </Link>
                      ) : (
                        <p className="font-bold text-slate-900 leading-tight capitalize">{p.student?.name || '—'}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{p.student?.phone}</p>
                    </td>
                    <td className="p-4 font-medium">{p.description}</td>
                    <td className="p-4 font-mono text-slate-500">
                      <div className="font-bold">{p.reference}</div>
                      {p.payuPaymentId && <div className="text-[11px] text-slate-500">PayU {p.payuPaymentId}</div>}
                      {p.bankReference && <div className="text-[11px] text-slate-500">Bank ref {p.bankReference}</div>}
                      {uploadHref(p.invoiceUrl) && (
                        <a href={uploadHref(p.invoiceUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-blue-600 hover:underline font-sans">
                          <FileText className="w-3 h-3" /> Invoice PDF
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] uppercase font-bold whitespace-nowrap">{METHOD_LABELS[p.method] || p.method}</span>
                      {p.createdBy?.name && <div className="text-[11px] text-slate-500 mt-1">by {p.createdBy.name}</div>}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 text-right whitespace-nowrap">{formatPaise(p.amount, p.currency)}</td>
                    <td className="p-4">
                      <PaymentStatusBadge status={p.status} />
                      {p.failure?.reason && <div className="text-[11px] text-rose-500 mt-1">{p.failure.description || p.failure.reason}</div>}
                      {p.fulfilment?.status === 'failed' && <div className="text-[11px] text-rose-500 mt-1">Ledger update pending</div>}
                      {p.status === 'paid' && (
                        p.invoiceEmail?.sentAt ? (
                          <div className="text-[11px] text-emerald-600 mt-1">Invoice emailed {formatDateTime(p.invoiceEmail.sentAt)}</div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-rose-500 mt-1" title={p.invoiceEmail?.error || ''}>
                            <AlertTriangle className="w-3 h-3" /> Invoice not emailed{p.invoiceEmail?.error ? `: ${p.invoiceEmail.error}` : ''}
                          </div>
                        )
                      )}
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(p.paidAt || p.createdAt)}
                      {p.method === 'payment_link' && p.expiresAt && ['created', 'pending'].includes(p.status) && (
                        <div className="text-[11px] text-slate-500">expires {formatDateTime(p.expiresAt)}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-0.5">
                        {p.method === 'payment_link' && ['created', 'pending'].includes(p.status) && <ShareActions payment={p} compact />}
                        {p.status !== 'paid' && (
                          <button type="button" onClick={() => syncPayment(p)} disabled={busyId === p._id} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-500/10 disabled:opacity-50" title="Check status with PayU">
                            <RefreshCw className={`w-4 h-4 ${busyId === p._id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {p.status === 'paid' && (
                          <button
                            type="button"
                            onClick={() => resendInvoice(p)}
                            disabled={busyId === p._id}
                            className={`p-1.5 rounded-lg disabled:opacity-50 ${busyId === p._id ? 'text-ame-orange' : p.invoiceEmail?.sentAt ? 'text-slate-500 hover:bg-slate-100' : 'text-rose-500 hover:bg-rose-50'}`}
                            title={busyId === p._id ? 'Sending invoice...' : p.invoiceEmail?.sentAt ? 'Resend invoice email' : 'Send invoice email'}
                          >
                            {busyId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        )}
                        {isAdmin && p.method === 'payment_link' && ['created', 'pending'].includes(p.status) && (
                          <button type="button" onClick={() => cancelLink(p)} disabled={busyId === p._id} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50" title="Cancel link">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
          <span>{data.total} payment{data.total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={data.page <= 1} onClick={() => setFilters((c) => ({ ...c, page: c.page - 1 }))} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold">Page {data.page} of {data.pages}</span>
            <button type="button" disabled={data.page >= data.pages} onClick={() => setFilters((c) => ({ ...c, page: c.page + 1 }))} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-500" /> Generate Payment Link
              </h3>
              <button onClick={closeGenerate} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {generated ? (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1">
                  <p className="text-xs font-bold text-slate-900">{generated.student?.name}</p>
                  <p className="text-[11px] text-slate-600">{generated.description} · <span className="font-semibold">{formatPaise(generated.amount, generated.currency)}</span></p>
                  <p className="text-[11px] font-mono text-slate-500">Reference {generated.reference}{generated.expiresAt ? ` · expires ${formatDateTime(generated.expiresAt)}` : ''}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment link</label>
                  <input readOnly value={generated.paymentUrl} onFocus={(e) => e.target.select()} className="input-field font-mono text-[11px]" />
                </div>
                <ShareActions payment={generated} />
                <p className="text-[11px] text-slate-500">The recipient pays on PayU's hosted page without logging in. The status updates here automatically through the PayU webhook, or on demand with the refresh icon.</p>
                <div className="pt-2 flex justify-end">
                  <button type="button" onClick={closeGenerate} className="btn-primary px-4 py-2">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Student</label>
                  <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="input-field">
                    <option value="">Choose student</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.profile?.studentId || s.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fee</label>
                  <select value={form.payableType} onChange={(e) => setForm({ ...form, payableType: e.target.value })} className="input-field">
                    {PAYABLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">The amount is taken from the student's profile: the registration fee set on the form, or the remaining tuition balance after scholarships and receipts.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Link valid for (days)</label>
                  <input type="number" min="1" max="90" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} className="input-field font-mono font-bold" />
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button type="button" onClick={closeGenerate} className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={generating} className="btn-primary px-4 py-2 disabled:opacity-60">{generating ? 'Creating...' : 'Generate Link'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlinePaymentsPage;
