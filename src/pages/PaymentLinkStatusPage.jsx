import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import ExamSiteHeader from '../components/ExamSiteHeader';
import ExamSiteFooter from '../components/ExamSiteFooter';
import { formatPaise } from '../utils/payuCheckout';

// Public page for a PayU payment link reference (/payment/:reference). Anyone with the
// reference can see whether the link is still payable; "Check status" asks PayU directly.

const PaymentLinkStatusPage = () => {
  const { reference } = useParams();
  const [payment, setPayment] = useState(null);
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  const show = (data) => {
    setPayment(data);
    setState(data.status);
  };

  useEffect(() => {
    let cancelled = false;
    api.get(`/online-payments/public/${reference}`)
      .then(({ data }) => {
        if (!cancelled) show(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setState(error.response?.status === 404 ? 'missing' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const checkStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { data } = await api.post(`/online-payments/public/${reference}/sync`);
      show(data);
      setMessage(data.syncError || '');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not check the status right now.');
    } finally {
      setChecking(false);
    }
  };

  const checkButton = (
    <button type="button" onClick={checkStatus} disabled={checking} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-800 disabled:opacity-60">
      <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
      {checking ? 'Checking...' : 'Check status with PayU'}
    </button>
  );

  const card = (icon, title, body, tone) => (
    <div className={`rounded-[28px] border p-8 shadow-xl ${tone}`}>
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="mt-4 space-y-2 text-base">{body}</div>
    </div>
  );

  const summary = payment && (
    <>
      <p>{payment.description}</p>
      <p className="text-3xl font-bold">{formatPaise(payment.amount, payment.currency)}</p>
      <p className="font-mono text-sm opacity-80">Reference {payment.reference}</p>
    </>
  );

  return (
    <div className="min-h-screen bg-white">
      <ExamSiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16 text-slate-600">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ame-blue border-t-transparent" />
            <p>{message || 'Loading payment details...'}</p>
          </div>
        )}
        {state === 'paid' && card(<CheckCircle2 className="h-8 w-8 text-emerald-600" />, 'Payment received', <>{summary}<p className="pt-2">Thank you. The institute has recorded this payment{payment?.paidAt ? ` on ${new Date(payment.paidAt).toLocaleString('en-IN')}` : ''}.</p></>, 'border-emerald-200 bg-emerald-50 text-emerald-900')}
        {state === 'pending' && card(<Clock3 className="h-8 w-8 text-amber-600" />, 'Payment being confirmed', <>{summary}<p className="pt-2">{message || 'PayU has received your payment and it is being confirmed. Do not pay again.'}</p>{checkButton}</>, 'border-amber-200 bg-amber-50 text-amber-900')}
        {state === 'created' && card(<Clock3 className="h-8 w-8 text-ame-blue" />, 'Payment due', <>{summary}{payment?.paymentUrl && <a href={payment.paymentUrl} className="mt-4 inline-block rounded-lg bg-[#F82900] px-6 py-3 text-base font-semibold text-white">Pay now</a>}<p className="pt-3 text-sm opacity-90">Already paid? {message ? `${message} ` : ''}</p>{checkButton}</>, 'border-slate-200 bg-[#2F5C95] text-white')}
        {state === 'failed' && card(<XCircle className="h-8 w-8 text-rose-600" />, 'Payment failed', <>{summary}<p className="pt-2">The last attempt did not go through. Open the link you were sent to try again.</p>{payment?.paymentUrl && <a href={payment.paymentUrl} className="mt-2 inline-block font-semibold underline">Try again</a>}{message && <p className="pt-2 text-sm">{message}</p>}{checkButton}</>, 'border-rose-200 bg-rose-50 text-rose-900')}
        {(state === 'expired' || state === 'cancelled') && card(<XCircle className="h-8 w-8 text-slate-500" />, state === 'expired' ? 'Link expired' : 'Link cancelled', <>{summary}<p className="pt-2">Please contact the institute for a new payment link.</p></>, 'border-slate-200 bg-slate-50 text-slate-800')}
        {state === 'missing' && card(<XCircle className="h-8 w-8 text-slate-500" />, 'Payment not found', <p>This payment reference does not exist. Check the link you were sent.</p>, 'border-slate-200 bg-slate-50 text-slate-800')}
        {state === 'error' && card(<XCircle className="h-8 w-8 text-rose-600" />, 'Something went wrong', <p>We could not load this payment. Please try again in a moment.</p>, 'border-rose-200 bg-rose-50 text-rose-900')}
        <p className="mt-8 text-center text-sm text-slate-500">
          Students can see all their payments after <Link to="/login" className="font-semibold text-ame-blue underline">signing in</Link>.
        </p>
      </main>
      <ExamSiteFooter />
    </div>
  );
};

export default PaymentLinkStatusPage;
