import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Admin-only. Records a submitted registration fee as received outside PayU
// (cash, bank transfer, and so on) and moves the student to Paid registrations.
const MarkRegistrationPaidButton = ({ studentId, name = '', onPaid, className = '' }) => {
  const user = useAuth()?.user;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  if (user?.role !== 'admin') return null;

  const close = () => {
    if (!busy) setOpen(false);
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      const response = await api.post(`/leads/registrations/${studentId}/mark-paid`, { note: note.trim() });
      setOpen(false);
      toast.success(response.data?.message || 'Registration marked paid');
      onPaid?.(response.data);
    } catch (error) {
      const alreadyPaid = error.response?.status === 409;
      toast.error(error.response?.data?.message || 'Could not mark the registration paid');
      if (alreadyPaid) {
        setOpen(false);
        onPaid?.(error.response?.data);
      }
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-paid-title"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 pb-4 pt-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="mark-paid-title" className="text-base font-bold text-slate-900">Mark registration paid</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              <span className="font-semibold capitalize text-slate-700">{name || 'This student'}</span>
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close" disabled={busy} className="text-slate-500 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-6 py-4">
          <p className="text-sm text-slate-600">
            Records the registration fee as received outside the online payment. The student moves to Paid registrations. This cannot be undone from here.
          </p>
          <label className="block text-xs font-semibold text-slate-700" htmlFor={`mark-paid-note-${studentId}`}>
            Note (optional)
            <textarea
              id={`mark-paid-note-${studentId}`}
              value={note}
              maxLength={200}
              rows={2}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Cash, bank transfer, receipt number"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-ame-orange"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={close}
            disabled={busy}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={markPaid}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            {busy ? 'Saving...' : 'Mark paid'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => { setNote(''); setOpen(true); }}
        disabled={busy}
        aria-label={`Mark ${name || 'registration'} paid`}
        className={className || 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60'}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Mark paid
      </button>
      {open && createPortal(dialog, document.body)}
    </>
  );
};

export default MarkRegistrationPaidButton;
