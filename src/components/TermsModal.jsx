import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Terms shown before creating an account. Edit the text in TERMS to change the content.
export const TERMS = [
  {
    title: 'Eligibility',
    body: 'Candidates must satisfy the eligibility criteria for the AIAEE 2027 (AME Entrance Exam) published by the Indian Institute of Aircraft Engineering. Registration does not by itself confirm eligibility; documents are verified before admission.',
  },
  {
    title: 'Accuracy of information',
    body: 'All details entered in the registration form (name, date of birth, contact details, education and uploaded documents) must be true and complete. Any false or misleading information can lead to cancellation of the registration, the examination result or the admission, without refund.',
  },
  {
    title: 'Registration fee',
    body: 'The registration fee is payable online through the payment gateway. The fee is non-refundable and non-transferable once paid, except where a payment is debited but the registration is not confirmed, in which case the amount is reconciled or refunded by the institute.',
  },
  {
    title: 'Examination',
    body: 'The admit card, examination date, centre and mode are communicated by the institute by email and on the student dashboard. The institute may change the examination schedule or centre; candidates will be informed. Use of unfair means during the examination results in disqualification.',
  },
  {
    title: 'Communication',
    body: 'By registering you agree to receive emails, SMS and WhatsApp messages from the institute about your application, payment, examination and admission. Keep your email and mobile number active and up to date.',
  },
  {
    title: 'Personal data',
    body: 'The information and documents you provide are used only for processing your application, examination and admission, and are stored securely. They are not sold or shared with third parties except as required for the payment gateway, examination conduct or by law.',
  },
  {
    title: 'Account',
    body: 'You are responsible for keeping your login password confidential. Any activity under your account is treated as yours. Inform the institute immediately if you suspect misuse.',
  },
  {
    title: 'Decisions of the institute',
    body: 'The decision of the Indian Institute of Aircraft Engineering on all matters relating to the registration, examination, results and admission is final. Disputes are subject to the jurisdiction of the courts at New Delhi.',
  },
];

const TermsModal = ({ open, onClose, onAccept }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="terms-title" className="text-xl font-bold text-slate-900">Terms and Conditions</h2>
            <p className="mt-0.5 text-sm text-slate-500">AIAEE 2027, AME Entrance Exam registration</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <ol className="space-y-4 text-sm leading-relaxed">
            {TERMS.map((item, index) => (
              <li key={item.title}>
                <p className="font-bold text-slate-900">{index + 1}. {item.title}</p>
                <p className="mt-1 text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Close
          </button>
          {onAccept && (
            <button type="button" onClick={onAccept} className="rounded-lg bg-[#2F5C95] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244a7a]">
              I agree
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
