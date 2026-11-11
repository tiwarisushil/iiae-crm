import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, MessageSquarePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const Detail = ({ label, children }) => (
  <div className="min-w-0">
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">{label}</p>
    <div className="break-words text-sm text-slate-900">{children || '-'}</div>
  </div>
);

// Details and follow-up remarks for one unpaid registration. Admin, manager and the counsellor
// it is assigned to can add remarks, so what happened after each call stays on record.
const RegistrationLeadModal = ({ studentId, canOpenForm, onClose, onRemarkAdded }) => {
  const [data, setData] = useState(null);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/leads/registrations/${studentId}`)
      .then((response) => { if (active) setData(response.data); })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Could not load the registration');
        onClose();
      });
    return () => { active = false; };
  }, [studentId]);

  const saveRemark = async (event) => {
    event.preventDefault();
    const text = remark.trim();
    if (!text) return;
    setSaving(true);
    try {
      const response = await api.post(`/leads/registrations/${studentId}/remarks`, { remark: text });
      const remarks = response.data.remarks || [];
      setData((current) => ({ ...current, remarks }));
      setRemark('');
      onRemarkAdded?.(studentId, remarks[0] || null);
      toast.success('Remark added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the remark');
    } finally {
      setSaving(false);
    }
  };

  const student = data?.student || {};
  const registration = data?.registration || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registration details"
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="truncate text-sm font-bold capitalize text-slate-900">{student.name || 'Registration'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        {!data ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="custom-scrollbar grid grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <Detail label="Phone">{student.phone && <a href={`tel:${student.phone}`} className="hover:text-ame-orange">{student.phone}</a>}</Detail>
                <Detail label="Email">{student.email}</Detail>
                <Detail label="Course">{registration.course}</Detail>
                <Detail label="Exam roll no">{registration.studentId || 'Not generated'}</Detail>
                {registration.examPhase && <Detail label="Exam phase">{registration.examPhase}</Detail>}
                <Detail label="Form submitted">{formatDateTime(registration.submittedAt)}</Detail>
                <Detail label="Registration fee">
                  {registration.feeAmount ? `₹${Number(registration.feeAmount).toLocaleString()}` : '-'} · {registration.feePaid ? 'Paid' : 'Unpaid'}
                </Detail>
                <Detail label="Lead source">{data.lead?.sourceLabel}</Detail>
                <Detail label="Counsellor">{data.lead?.assignedTo?.name || 'Unassigned'}</Detail>
                {registration.registeredBy && <Detail label="Registered by">{registration.registeredBy}</Detail>}
                {data.lead?.createdAt && <Detail label="Lead received">{formatDateTime(data.lead.createdAt)}</Detail>}
              </div>
              {canOpenForm && (
                <Link to={`/dashboard/registrations/student/${studentId}`} className="inline-block text-xs font-bold text-blue-600 hover:underline">
                  Open the full registration form
                </Link>
              )}
            </div>

            <div className="flex min-h-0 flex-col gap-3">
              <form onSubmit={saveRemark} className="space-y-2 bg-amber-50 p-3">
                <label htmlFor="registration-remark" className="block text-xs font-semibold uppercase tracking-wide text-amber-800">Add remark</label>
                <textarea
                  id="registration-remark"
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="What happened on the call? e.g. Will pay by Monday"
                  rows="3"
                  maxLength={1000}
                  className="input-field resize-none bg-white py-2"
                />
                <button type="submit" disabled={saving || !remark.trim()} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                  <MessageSquarePlus className="h-4 w-4" /> {saving ? 'Saving...' : 'Save remark'}
                </button>
              </form>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks ({data.remarks.length})</p>
                {data.remarks.length ? (
                  <ol className="space-y-2">
                    {data.remarks.map((entry, index) => (
                      <li key={`${entry.date}-${index}`} className="border-l-2 border-amber-300 pl-3">
                        <p className="whitespace-pre-wrap text-sm text-slate-900">{entry.remark}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{entry.caller} · {formatDateTime(entry.date)}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-500">No remarks yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationLeadModal;
