import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, Check, Mail, Phone, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Admin-only button that deletes (hides) a lead or a registration after a confirmation,
// optionally blocking the person's email and phone so no lead can be added with them again.
// Nothing is erased: deleted records stay in the database and can be restored there.
//
//   <DeleteRecordButton kind="manual" id={lead._id} name={lead.fullName} email={lead.email} phone={lead.phone} onDeleted={...} />
//   <DeleteRecordButton kind="registration" id={student._id} name={student.name} email=... phone=... paid onDeleted={...} />
//
// The API answers 200 with deleted: 0 when it keeps the record (a lead with a registration),
// so onDeleted only runs when something was actually deleted.

const KIND_LABELS = {
  meta: 'Meta lead',
  manual: 'Added lead',
  website: 'Website lead',
  google: 'Google Ads lead',
};

// What each kind of delete removes from the CRM (see deleteRecordsController on the API)
const REMOVES = {
  registration: [
    'The registration from the paid and unpaid lists',
    'The student login (they are signed out)',
    'Their admit card',
  ],
  lead: [
    'The lead from the lead lists',
    "The lead from its counsellor's list",
  ],
};

const DeleteRecordButton = ({ kind, id, name = '', email = '', phone = '', paid = false, onDeleted, compact = false, className = '' }) => {
  const user = useAuth()?.user;
  const [open, setOpen] = useState(false);
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    // Cancel has focus, so Enter does not delete by accident
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  if (user?.role !== 'admin') return null;

  const isRegistration = kind === 'registration';
  const what = isRegistration ? 'registration' : 'lead';
  const label = KIND_LABELS[kind] || 'Lead';
  const contacts = [
    email && { icon: Mail, value: String(email).trim() },
    phone && { icon: Phone, value: String(phone).trim() },
  ].filter((item) => item && item.value);

  const start = () => {
    setBlock(false);
    setOpen(true);
  };

  const close = () => {
    if (!busy) setOpen(false);
  };

  const remove = async () => {
    setBusy(true);
    try {
      const response = isRegistration
        ? await api.post('/leads/registrations/delete', { studentIds: [id], block })
        : await api.post('/leads/delete', { kind, ids: [id], block });
      setOpen(false);
      if (response.data?.deleted > 0) {
        toast.success(`${isRegistration ? 'Registration' : 'Lead'} deleted${response.data.blocked ? ' and blocked' : ''}`);
        onDeleted?.();
      } else {
        toast.error(response.data?.message || `The ${what} was not deleted`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not delete the ${what}`);
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-record-title"
      aria-describedby="delete-record-subtitle"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={close} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 pb-4 pt-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-4 ring-rose-50/60">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="delete-record-title" className="text-base font-bold text-slate-900">Delete {what}</h3>
            <p id="delete-record-subtitle" className="mt-0.5 truncate text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{name || `This ${what}`}</span>
              {/* Which list a lead is in; the title already says "registration" */}
              {!isRegistration && (
                <>
                  <span className="mx-1.5 text-slate-300">|</span>
                  {label}
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Close" className="-mr-2 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">This removes from the CRM:</p>
            <ul className="mt-2 space-y-1.5">
              {REMOVES[isRegistration ? 'registration' : 'lead'].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {isRegistration && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <p>
                {paid && <><span className="font-semibold">Payments are kept.</span>{' '}</>}
                {block
                  ? 'Their lead records are removed too, because the email and phone are being blocked.'
                  : 'Their lead stays in the lead lists, so they can register again. Their email is freed for that.'}
              </p>
            </div>
          )}

          {contacts.length > 0 && (
            <label
              className={`block cursor-pointer rounded-xl border p-4 transition-colors ${block ? 'border-rose-300 bg-rose-50/70' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <span className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Ban className={`h-4 w-4 ${block ? 'text-rose-600' : 'text-slate-400'}`} aria-hidden="true" />
                    Also block this email and phone
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    Use this for spam. No lead or registration can be added with them again, from any source.
                  </span>
                </span>
                {/* Switch */}
                <input
                  type="checkbox"
                  role="switch"
                  checked={block}
                  onChange={(event) => setBlock(event.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-rose-400 peer-focus-visible:ring-offset-2 ${block ? 'bg-rose-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${block ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
              </span>
              <span className="mt-3 flex flex-wrap gap-2">
                {contacts.map(({ icon: Icon, value }) => (
                  <span
                    key={value}
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${block ? 'border-rose-200 bg-white text-rose-800' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{value}</span>
                    {block && <Check className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />}
                  </span>
                ))}
              </span>
              {block && (
                <span className="mt-2 block text-xs text-rose-700">You can unblock them later under Leads &gt; Blocked Contacts.</span>
              )}
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">Hidden, not erased: it can be restored from the database.</p>
          <div className="flex gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={close}
              disabled={busy}
              className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60 sm:flex-none"
            >
              {block ? <Ban className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {busy ? 'Deleting...' : (block ? 'Delete and block' : `Delete ${what}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        title={`Delete ${what}`}
        aria-label={compact ? `Delete ${what}${name ? ` ${name}` : ''}` : undefined}
        className={className || `inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60 ${compact ? '!px-2' : ''}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!compact && (busy ? 'Deleting...' : `Delete ${what}`)}
      </button>
      {/* Rendered at the page level, so table cells and modals around the button do not style it */}
      {open && createPortal(dialog, document.body)}
    </>
  );
};

export default DeleteRecordButton;
