import React, { useEffect, useState } from 'react';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import PayuPayButton, { registrationEndpoints } from './PayuPayButton';
import PaymentReturnNotice from './PaymentReturnNotice';
import { formatPaise } from '../utils/payuCheckout';

// Shown once the form is submitted: pays the registration fee through PayU using the
// form link as the access check, so the student does not need to log in first.
const RegistrationFeePayment = ({ token, onLoaded }) => {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = async () => {
    try {
      const { data } = await api.get(`/online-payments/registration/${token}`);
      setState({ loading: false, error: '', data });
      if (onLoaded) onLoaded(data);
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.message || 'Could not load the registration fee', data: null });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // The payer returns from PayU to this page with ?payment=&result=
  const notice = <PaymentReturnNotice endpoints={registrationEndpoints(token)} onPaid={load} />;

  if (state.loading) return <p className="text-sm text-slate-500">Loading registration fee...</p>;
  if (state.error) return <p className="text-sm text-slate-600">{state.error}</p>;

  const fee = state.data?.fee;
  if (!fee || fee.amount <= 0) return null;

  if (fee.paid) {
    return (
      <div className="space-y-3">
        {notice}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Registration fee of {formatPaise(fee.amount, fee.currency)} is paid.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notice}
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-slate-900">Registration fee: {formatPaise(fee.amount, fee.currency)}</p>
        {state.data.enabled ? (
          <>
            <p className="text-sm text-slate-600">Pay securely with PayU (UPI, card, net banking). You will be taken to PayU's payment page and brought back here. Your application is confirmed as soon as the payment is received.</p>
            <PayuPayButton
              payableType="registration_fee"
              label="Pay registration fee"
              endpoints={registrationEndpoints(token)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            />
          </>
        ) : (
          <p className="text-sm text-slate-600">{state.data.message || 'Online payment is not available right now. The institute will confirm the fee.'}</p>
        )}
      </div>
    </div>
  );
};


// Public URL a counsellor or admin can send to the student so they pay without logging in
export const registrationPaymentUrl = (token) => `${window.location.origin}/pay/registration/${token}`;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
};

export const RegistrationPaymentShare = ({ token, studentName = '', email = '', phone = '' }) => {
  const url = registrationPaymentUrl(token);
  const message = `Dear ${studentName || 'student'}, please pay your IIAE exam registration fee securely through PayU using this link: ${url}`;
  const digits = String(phone || '').replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${digits ? (digits.length === 10 ? `91${digits}` : digits) : ''}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${email}?subject=${encodeURIComponent('IIAE registration fee payment link')}&body=${encodeURIComponent(message)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const action = 'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50';

  const copy = async () => {
    if (await copyText(url)) toast.success('Payment link copied');
    else toast.error('Could not copy. Select the link and copy it manually.');
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-900">Share the payment link with the student</p>
      <p className="text-xs text-slate-500">The student opens it and pays without logging in. The registration turns paid as soon as PayU confirms the payment.</p>
      <input readOnly value={url} onFocus={(e) => e.target.select()} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={action}><Copy className="h-3.5 w-3.5" /> Copy link</button>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className={action}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
        <a href={mailHref} className={action}><Mail className="h-3.5 w-3.5" /> Email</a>
        {canNativeShare && (
          <button type="button" onClick={() => navigator.share({ title: 'IIAE registration fee', text: message, url }).catch(() => {})} className={action}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        )}
      </div>
    </div>
  );
};

export default RegistrationFeePayment;
