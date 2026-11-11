import React, { useEffect, useState } from 'react';
import { CalendarRange, Plus, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useSession, formatSessionRange } from '../context/SessionContext';

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const emptyForm = { name: '', startDate: '', endDate: '', isCurrent: false };

// Admin page: name sessions (e.g. "Session 24-25") and give each a date range.
// Every list in the CRM is filtered to the session chosen in the sidebar.
const SessionsPage = () => {
  const { sessions, currentSessionId, loading, refresh, selectSession, selectedId } = useSession();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, isCurrent: sessions.length === 0 });
    setShowForm(true);
  };

  const startEdit = (session) => {
    setEditingId(session._id);
    setForm({
      name: session.name,
      startDate: toInputDate(session.startDate),
      endDate: toInputDate(session.endDate),
      isCurrent: Boolean(session.isCurrent),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Give the session a name');
    if (!form.startDate || !form.endDate) return toast.error('Choose a start and end date');
    if (form.endDate <= form.startDate) return toast.error('End date must be after the start date');

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, isCurrent: form.isCurrent };
      if (editingId) {
        await api.put(`/sessions/${editingId}`, payload);
        toast.success('Session updated');
      } else {
        await api.post('/sessions', payload);
        toast.success('Session created');
      }
      await refresh();
      closeForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the session');
    } finally {
      setSaving(false);
    }
  };

  const makeCurrent = async (session) => {
    try {
      await api.put(`/sessions/${session._id}/current`);
      toast.success(`${session.name} is now the current session`);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the session');
    }
  };

  const remove = async (session) => {
    const isCurrentSession = String(session._id) === String(currentSessionId);
    const warning = isCurrentSession
      ? ' It is the current session: until you mark another one current, every page shows all sessions and students cannot register again for a new session.'
      : '';
    if (!window.confirm(`Delete "${session.name}"? Records are kept; only the session range is removed.${warning}`)) return;
    try {
      await api.delete(`/sessions/${session._id}`);
      if (selectedId === String(session._id)) selectSession('');
      toast.success('Session deleted');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-blue-600" /> Sessions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            A session is a named date range, like Session 24-25 for 01/03/2024 to 01/02/2025. Leads, registrations, payments and
            dashboard figures are shown for the session picked in the top bar. The current session is what everyone sees by default.
          </p>
        </div>
        <button onClick={startCreate} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <Plus className="w-4 h-4" /> New session
        </button>
      </div>

      {!loading && sessions.length > 0 && !currentSessionId && (
        <div role="alert" className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          No session is marked current. Every page shows records from all sessions, and students from an earlier session
          cannot register again. Mark the running session as current.
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Edit session' : 'New session'}</h3>
            <button type="button" onClick={closeForm} className="p-1 text-slate-500 hover:text-slate-700 cursor-pointer" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Session name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Session 24-25"
                maxLength={80}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start date</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">End date</span>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                className="w-4 h-4"
              />
              Current session
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs px-4 py-2.5 disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create session'}
            </button>
            <button type="button" onClick={closeForm} className="text-xs font-bold text-slate-500 px-4 py-2.5 hover:text-slate-800 cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading && !sessions.length ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Session</th>
                  <th className="p-4">Date range</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sessions.length ? sessions.map((session) => {
                  const isCurrent = String(session._id) === String(currentSessionId);
                  return (
                    <tr key={session._id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{session.name}</td>
                      <td className="p-4 font-mono text-slate-600">{formatSessionRange(session)}</td>
                      <td className="p-4 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle className="w-3.5 h-3.5" /> CURRENT
                          </span>
                        ) : (
                          <button onClick={() => makeCurrent(session)} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
                            Make current
                          </button>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(session)} className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" aria-label={`Edit ${session.name}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => remove(session)} className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer" aria-label={`Delete ${session.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-semibold">
                      No sessions yet. Until one is created, every page shows all records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;
