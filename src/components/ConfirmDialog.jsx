import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Small modal asking the user to confirm an action. Escape or the backdrop cancels.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass = tone === 'danger'
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-primary hover:bg-primary-hover text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button type="button" onClick={onCancel} aria-label="Close" className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-base font-bold text-slate-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} autoFocus className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
