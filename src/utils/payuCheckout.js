// PayU hosted checkout: the backend creates the transaction and returns the form fields
// (including the request hash); the browser posts them to PayU's payment page. The
// merchant salt never reaches this file. After paying, PayU posts the browser back to
// the API, which verifies the response hash and redirects to the page the payment was
// started from with ?payment=<id>&result=<outcome>.

// Builds a hidden form from the backend payload and submits it (full-page navigation)
export const submitPayuForm = ({ action, params }, doc = typeof document !== 'undefined' ? document : null) => {
  if (!doc) throw new Error('PayU checkout needs a browser');
  if (!/^https:\/\/(test|secure)\.payu\.in\//.test(String(action || ''))) {
    throw new Error('Unexpected payment gateway address');
  }
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  form.setAttribute('data-gateway', 'payu');
  Object.entries(params || {}).forEach(([name, value]) => {
    if (value === undefined || value === null) return;
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });
  doc.body.appendChild(form);
  form.submit();
  return form;
};

// Reads the outcome PayU's return redirect appended to the current URL
export const readReturnResult = (search) => {
  const query = new URLSearchParams(search || '');
  const paymentId = query.get('payment') || '';
  const result = query.get('result') || '';
  if (!result) return null;
  return { paymentId, result };
};

// Removes ?payment=&result= so a refresh does not re-show the banner
export const stripReturnResult = (search) => {
  const query = new URLSearchParams(search || '');
  query.delete('payment');
  query.delete('result');
  const rest = query.toString();
  return rest ? `?${rest}` : '';
};

export const formatPaise = (paise, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format((Number(paise) || 0) / 100);

export const PAYMENT_STATUS_LABELS = {
  created: 'Not paid yet',
  pending: 'Awaiting confirmation',
  paid: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

// Text shown for each ?result= value PayU's return redirect can carry
export const RETURN_RESULT_MESSAGES = {
  paid: 'Thank you. The institute has recorded this payment.',
  failed: 'The payment did not go through. No money was taken. You can try again.',
  pending: 'PayU has received your payment and it is being confirmed. Do not pay again; check the status in a minute.',
  mismatch: 'The payment details reported by PayU do not match this payment. It has been flagged for review; please contact the institute.',
  invalid: 'The payment response could not be verified. If money was deducted it will be reconciled automatically; check the status in a minute.',
  error: 'Something went wrong while confirming the payment. If money was deducted it will be reconciled automatically.',
};
