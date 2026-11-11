import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react';
import api from '../utils/api';
import { studentEndpoints } from './PayuPayButton';
import { readReturnResult, stripReturnResult, formatPaise, RETURN_RESULT_MESSAGES } from '../utils/payuCheckout';

// Shown on the page PayU sends the payer back to (?payment=<id>&result=<outcome>).
// Loads the payment from the backend - the query string is only a hint, the stored
// status is what is displayed. Pending payments can be re-checked (sync with PayU).
const PaymentReturnNotice = ({ endpoints = studentEndpoints, onPaid, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result] = useState(() => readReturnResult(location.search));
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(Boolean(result?.paymentId));
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const notified = useRef(false);

  const applyPayment = (data) => {
    setPayment(data);
    if (data?.status === 'paid' && onPaid && !notified.current) {
      notified.current = true;
      onPaid(data);
    }
  };

  useEffect(() => {
    if (!result) return;
    // Drop the query string so a refresh or back-navigation does not replay the banner
    navigate({ pathname: location.pathname, search: stripReturnResult(location.search) }, { replace: true });
    if (!result.paymentId) return;
    let cancelled = false;
    api.get(endpoints.status(result.paymentId))
      .then(({ data }) => {
        if (!cancelled) applyPayment(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result || dismissed) return null;

  const checkStatus = async () => {
    if (!result.paymentId || checking) return;
    setChecking(true);
    try {
      const { data } = await api.get(endpoints.status(result.paymentId), { params: { sync: 'true' } });
      applyPayment(data);
    } catch (error) {
      // keep showing the last known state
    } finally {
      setChecking(false);
    }
  };

  const close = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  const status = payment?.status || (result.result === 'paid' ? 'paid' : result.result === 'failed' ? 'failed' : 'pending');
  const tone = status === 'paid'
    ? { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icon: CheckCircle2, title: 'Payment received' }
    : status === 'failed' || result.result === 'mismatch'
      ? { box: 'border-rose-200 bg-rose-50 text-rose-900', Icon: XCircle, title: 'Payment not completed' }
      : { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: Clock3, title: 'Payment being confirmed' };

  const message = status === 'paid'
    ? RETURN_RESULT_MESSAGES.paid
    : payment?.failure?.description && status === 'failed'
      ? payment.failure.description
      : RETURN_RESULT_MESSAGES[result.result] || RETURN_RESULT_MESSAGES.pending;

  return (
    <div role={status === 'paid' ? 'status' : 'alert'} className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 text-sm ${tone.box}`}>
      <div className="flex items-start gap-3">
        {loading ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" /> : <tone.Icon className="mt-0.5 h-5 w-5 shrink-0" />}
        <div className="flex-1">
          <p className="font-bold">{tone.title}</p>
          <p className="mt-1">{message}</p>
          {payment && (
            <p className="mt-2 font-mono text-xs opacity-80">
              {formatPaise(payment.amount, payment.currency)} · Reference {payment.reference}
              {payment.payuPaymentId ? ` · PayU ID ${payment.payuPaymentId}` : ''}
            </p>
          )}
        </div>
        <button type="button" onClick={close} className="text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100" aria-label="Dismiss">
          Close
        </button>
      </div>
      {status !== 'paid' && status !== 'failed' && result.paymentId && (
        <button type="button" onClick={checkStatus} disabled={checking} className="inline-flex items-center gap-1.5 self-start rounded-full border border-current/30 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check status'}
        </button>
      )}
    </div>
  );
};

export default PaymentReturnNotice;
