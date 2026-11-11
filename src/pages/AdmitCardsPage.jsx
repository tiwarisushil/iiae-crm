import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import HtmlEditor from '../components/HtmlEditor';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CalendarRange, Download, Lock, Ticket, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const IST_OFFSET_MS = 330 * 60 * 1000;

const todayIndia = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const indiaDateInput = (value) => (value ? new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : '');

const formatDay = (value, options = {}) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata', ...options })
  : '');

// "14:30" -> "2:30 pm"
const formatClock = (value) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return value || '';
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'pm' : 'am'}`;
};

const fileName = (sessionName, phase) => `admit-cards-${`${sessionName}-${phase}`.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const blobErrorMessage = async (error, fallback) => {
  if (error.response?.data instanceof Blob) {
    try {
      return JSON.parse(await error.response.data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return error.response?.data?.message || fallback;
};

const statusOf = (phase) => {
  if (phase.release) return { label: 'Released', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (phase.registrationOpen) return { label: 'Registration open', className: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (phase.canRelease) return { label: 'Ready to release', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: 'Not available', className: 'bg-slate-100 text-slate-600 border-slate-200' };
};

// True when the editor's HTML has no visible text
const isBlankHtml = (html) => !String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '');

const fieldClass = 'input-field mt-1.5 rounded-md bg-white py-2 text-sm text-slate-900';

// Asks for the exam date, timing and instructions, then releases the phase's admit cards (the exam is online)
const ReleaseDialog = ({ phase, sessionName, defaultInstructionsHtml, onClose, onReleased }) => {
  const [form, setForm] = useState({
    examDate: indiaDateInput(phase.release?.examDate) || '',
    startTime: phase.release?.startTime || '10:00',
    endTime: phase.release?.endTime || '13:00',
    instructionsHtml: phase.release?.instructionsHtml || defaultInstructionsHtml || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.examDate) return setError('Choose the examination date.');
    if (form.examDate < todayIndia()) return setError('The examination date cannot be in the past.');
    if (!form.startTime || !form.endTime) return setError('Choose the start and end time.');
    if (form.endTime <= form.startTime) return setError('The examination must end after it starts.');
    if (isBlankHtml(form.instructionsHtml)) return setError('Write the instructions for the candidates.');
    setError('');
    setSaving(true);
    try {
      const response = await api.post('/admit-cards/release', { examPhase: phase.examPhase, ...form });
      toast.success(response.data?.message || 'Admit cards released');
      onReleased(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not release the admit cards');
      setSaving(false);
    }
  };

  const updating = Boolean(phase.release);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="release-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !saving && onClose()} />
      <form onSubmit={submit} className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-md bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="release-title" className="text-base font-semibold text-slate-900">
              {updating ? 'Update admit cards' : 'Release admit cards'}: {phase.examPhase}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{sessionName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="exam-date" className="block text-sm font-medium text-slate-900">Examination date</label>
              <input id="exam-date" type="date" required min={todayIndia()} value={form.examDate} onChange={set('examDate')} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="exam-start" className="block text-sm font-medium text-slate-900">Starts at</label>
              <input id="exam-start" type="time" required value={form.startTime} onChange={set('startTime')} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="exam-end" className="block text-sm font-medium text-slate-900">Ends at</label>
              <input id="exam-end" type="time" required value={form.endTime} onChange={set('endTime')} className={fieldClass} />
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <span id="instructions-label" className="block text-sm font-medium text-slate-900">Instructions</span>
              {defaultInstructionsHtml && form.instructionsHtml !== defaultInstructionsHtml && (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, instructionsHtml: defaultInstructionsHtml }))}
                  className="text-xs font-medium text-ame-orange hover:text-amber-700"
                >
                  Use the standard instructions
                </button>
              )}
            </div>
            <div className="mt-1.5" aria-labelledby="instructions-label">
              <HtmlEditor
                value={form.instructionsHtml}
                onChange={(html) => setForm((current) => ({ ...current, instructionsHtml: html }))}
                minHeight={180}
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Printed under &ldquo;Instructions&rdquo; on every card. Bold, italic, underline, headings and lists are kept; links and pictures are not.
            </p>
          </div>

          <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">{phase.paid}</span> fee-paid student{phase.paid === 1 ? '' : 's'} will get an admit card.
              {phase.unpaid > 0 && <> {phase.unpaid} unpaid registration{phase.unpaid === 1 ? '' : 's'} will not.</>}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {updating
                ? 'Existing cards keep their roll numbers and get the new date and timing.'
                : 'Students can then download their card from their dashboard.'}
              {' '}Download the PDF of all cards from the phase afterwards.
            </p>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary rounded-md !border-ame-orange !bg-ame-orange hover:!border-amber-600 hover:!bg-amber-600 disabled:opacity-60">
            <Ticket className="h-4 w-4" /> {saving ? (updating ? 'Updating...' : 'Releasing...') : (updating ? 'Update admit cards' : 'Release admit cards')}
          </button>
        </div>
      </form>
    </div>
  );
};

const AdmitCardsPage = () => {
  const { user } = useAuth();
  const canRelease = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogPhase, setDialogPhase] = useState(null);
  const [downloadingId, setDownloadingId] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get('/admit-cards/phases');
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load the exam phases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (releaseId, phaseName) => {
    setDownloadingId(String(releaseId));
    try {
      const response = await api.get(`/admit-cards/releases/${releaseId}/pdf`, { responseType: 'blob' });
      triggerDownload(response.data, fileName(data?.session?.name || 'session', phaseName));
    } catch (error) {
      toast.error(await blobErrorMessage(error, 'Could not download the admit cards'));
    } finally {
      setDownloadingId('');
    }
  };

  // The PDF is not downloaded here; it stays on the phase's Download PDF button
  const released = async () => {
    setDialogPhase(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ame-orange border-t-transparent" />
      </div>
    );
  }

  const session = data?.session;
  const phases = data?.phases || [];

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Ticket className="h-6 w-6 shrink-0 text-ame-orange" /> Admit Cards
          </h2>
          <p className="mt-1 text-sm text-slate-900">
            Release admit cards for an exam phase once its registration has closed. Every fee-paid student in the phase gets one.
          </p>
        </div>
        {session && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            <CalendarRange className="h-3.5 w-3.5" /> {session.name}
          </span>
        )}
      </div>

      {!session && (
        <div role="alert" className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">No session is marked current.</span> Admit cards are released for the phases of the current session.{' '}
            {canRelease && <Link to="/dashboard/sessions" className="font-semibold underline underline-offset-2">Go to Sessions</Link>}
          </p>
        </div>
      )}

      {session && !data.downloadsEnabled && phases.some((phase) => phase.release) && (
        <div role="alert" className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Student downloads are turned off,</span> so students cannot see their released cards.{' '}
            {canRelease && <Link to="/dashboard/settings/downloads" className="font-semibold underline underline-offset-2">Download Settings</Link>}
          </p>
        </div>
      )}

      {session && phases.length === 0 && (
        <div className="rounded-md border border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No registrations in {session.name} yet.
        </div>
      )}

      {phases.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {phases.map((phase) => {
            const status = statusOf(phase);
            const name = phase.examPhase || 'No phase';
            return (
              <section key={name} className="flex flex-col rounded-md border border-slate-300 bg-white" aria-label={name}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {phase.registrations} registration{phase.registrations === 1 ? '' : 's'}: {phase.paid} paid, {phase.unpaid} unpaid
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                </div>

                <div className="flex-1 px-5 py-4 text-sm">
                  {phase.release ? (
                    <dl className="divide-y divide-slate-100">
                      {[
                        ['Exam date', formatDay(phase.release.examDate, { weekday: 'short' })],
                        ['Timing', `${formatClock(phase.release.startTime)} to ${formatClock(phase.release.endTime)}`],
                        ['Cards issued', phase.cardsIssued],
                        ['Released on', `${formatDay(phase.release.releasedAt)}${phase.release.releasedBy ? ` by ${phase.release.releasedBy}` : ''}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5">
                          <dt className="text-slate-600">{label}</dt>
                          <dd className="text-right font-medium text-slate-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-slate-600">
                      {phase.canRelease ? 'Registration has closed. Set the exam date and timing to release the admit cards.' : phase.blockedReason}
                    </p>
                  )}
                  {phase.paidWithoutCard > 0 && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      {phase.paidWithoutCard} student{phase.paidWithoutCard === 1 ? ' has' : 's have'} paid since the release.
                      {canRelease ? ' Update the release to issue their cards.' : ''}
                    </p>
                  )}
                </div>

                {(phase.release || (canRelease && phase.canRelease)) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3">
                    {canRelease && phase.canRelease && (
                      <button
                        type="button"
                        onClick={() => setDialogPhase(phase)}
                        className={phase.release
                          ? 'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50'
                          : 'btn-primary rounded-md !border-ame-orange !bg-ame-orange hover:!border-amber-600 hover:!bg-amber-600'}
                      >
                        <Ticket className="h-4 w-4" /> {phase.release ? 'Update release' : 'Release admit cards'}
                      </button>
                    )}
                    {phase.release && (
                      <button
                        type="button"
                        onClick={() => download(phase.release._id, phase.examPhase)}
                        disabled={downloadingId === String(phase.release._id)}
                        className="ml-auto inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" /> {downloadingId === String(phase.release._id) ? 'Preparing...' : 'Download PDF'}
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {dialogPhase && (
        <ReleaseDialog
          phase={dialogPhase}
          sessionName={session?.name || ''}
          defaultInstructionsHtml={data?.defaultInstructionsHtml || ''}
          onClose={() => setDialogPhase(null)} onReleased={released} />
      )}
    </div>
  );
};

export default AdmitCardsPage;
