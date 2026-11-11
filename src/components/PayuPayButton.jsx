import React, { useEffect, useRef, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import api from '../utils/api';
import { submitPayuForm, formatPaise } from '../utils/payuCheckout';

// Pay Now for a fee on the student's own profile. The backend decides the amount and signs
// the request; this component only posts the returned form to PayU's hosted page. The
// browser leaves the app and comes back through the API's return endpoint, so the result
// is shown by PaymentReturnNotice on the page the payer lands on.
//
// phases: idle -> starting -> redirecting | error

// Endpoints used by a logged-in student. The registration form passes its own
// token-scoped set (see registrationEndpoints).
export const studentEndpoints = {
  createOrder: () => '/online-payments/orders',
  status: (id) => `/online-payments/${id}`,
};

export const registrationEndpoints = (token) => ({
  createOrder: () => `/online-payments/registration/${token}/orders`,
  status: (id) => `/online-payments/registration/${token}/orders/${id}`,
});

const PayuPayButton = ({
  payableType,
  label = 'Pay now',
  amount,
  className = 'btn-primary shrink-0 px-5 py-3 text-base disabled:opacity-60',
  endpoints = studentEndpoints,
  onStatusChange,
  submitForm = submitPayuForm,
}) => {
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = (nextPhase, nextMessage = '') => {
    if (!mounted.current) return;
    setPhase(nextPhase);
    setMessage(nextMessage);
    if (onStatusChange) onStatusChange(nextPhase);
  };

  const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

  const pay = async () => {
    if (phase === 'starting' || phase === 'redirecting') return;
    update('starting', 'Preparing secure checkout...');

    let order;
    try {
      const { data } = await api.post(endpoints.createOrder(), { payableType });
      order = data;
    } catch (error) {
      update('error', errorText(error, 'Could not start the payment. Please try again.'));
      return;
    }

    try {
      update('redirecting', 'Taking you to PayU to complete the payment...');
      submitForm(order);
    } catch (error) {
      update('error', errorText(error, 'Could not open the PayU payment page.'));
    }
  };

  const busy = phase === 'starting' || phase === 'redirecting';
  const buttonText =
    phase === 'starting' ? 'Preparing...'
      : phase === 'redirecting' ? 'Redirecting to PayU...'
        : phase === 'error' ? 'Try again'
          : label;

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <button type="button" onClick={pay} disabled={busy} className={className} aria-busy={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {buttonText}
        {amount ? ` ${formatPaise(amount)}` : ''}
      </button>

      {phase === 'error' && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:max-w-md">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {busy && message && (
        <p role="status" className="text-sm text-slate-500">{message}</p>
      )}
    </div>
  );
};

export default PayuPayButton;
