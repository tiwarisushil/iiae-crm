import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSession } from '../context/SessionContext';
import { AlertTriangle, CalendarRange, ClipboardList, ExternalLink, Power, PowerOff, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const statusStyle = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-amber-50 text-amber-800 border-amber-200',
  disabled: 'bg-slate-100 text-slate-600 border-slate-200',
  closed: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusLabel = {
  live: 'Live',
  scheduled: 'Scheduled',
  disabled: 'Off',
  closed: 'Closed',
};

const IST_OFFSET_MS = 330 * 60 * 1000;

const formatIndia = (value, withTime = true) => {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
};

// The date inputs are India time, like the API (YYYY-MM-DDTHH:mm), whatever the browser zone is
const toIndiaInput = (value) => new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
const nowIndia = () => toIndiaInput(Date.now());

// "2026-03-01T09:00" -> "01 Mar 2026, 9:00 am" for messages
const showInput = (value) => formatIndia(`${value}:00+05:30`);

const toDraft = (data) => ({
  phaseName: data.phaseName || '',
  registrationSeries: data.registrationSeries || '',
  liveFromInput: data.liveFromInput || '',
  disableAtInput: data.disableAtInput || '',
  registrationFee: String(data.registrationFee ?? 0),
});

// What stops these phase details from being saved on a live form. Mirrors the API's checks.
const problemsFor = (draft, bounds) => {
  const problems = {};
  if (!draft.phaseName.trim()) problems.phaseName = 'Enter the phase name, for example Phase 1.';
  if (!/^\d{4}$/.test(draft.registrationSeries.trim())) {
    problems.registrationSeries = draft.registrationSeries.trim()
      ? 'Enter all 4 digits, for example 2627.'
      : 'Enter the 4-digit series, for example 2627.';
  }
  if (!draft.liveFromInput) problems.liveFromInput = 'Choose when the phase starts.';
  if (!draft.disableAtInput) problems.disableAtInput = 'Choose when the phase ends.';
  if (draft.liveFromInput && draft.disableAtInput && draft.disableAtInput <= draft.liveFromInput) {
    problems.disableAtInput = 'The phase must end after it starts.';
  }
  if (bounds) {
    if (draft.liveFromInput && draft.liveFromInput < bounds.min) {
      problems.liveFromInput = `The current session starts on ${showInput(bounds.min)}.`;
    }
    if (draft.disableAtInput && draft.disableAtInput > bounds.max) {
      problems.disableAtInput = `The current session ends on ${showInput(bounds.max)}.`;
    }
  }
  const fee = Number(draft.registrationFee);
  if (draft.registrationFee === '' || !Number.isFinite(fee) || fee < 0) problems.registrationFee = 'Enter a fee of 0 or more.';
  return problems;
};

const FieldError = ({ id, message }) => (message ? <p id={id} className="mt-1 text-xs font-medium text-rose-600">{message}</p> : null);

// A labelled input with its error below it, linked for screen readers
const Field = ({ id, label, error, className = '', children }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-medium text-slate-900">{label}</label>
    {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })}
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const inputClass = (invalid) => `input-field mt-1.5 rounded-md bg-white py-2 text-sm font-normal text-slate-900 ${invalid ? '!border-rose-400' : ''}`;

const RegistrationWindowPage = () => {
  const { sessions, currentSessionId, loading: sessionsLoading } = useSession();
  const [windowState, setWindowState] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  const currentSession = useMemo(
    () => sessions.find((session) => String(session._id) === String(currentSessionId)) || null,
    [sessions, currentSessionId]
  );
  const bounds = useMemo(() => (currentSession
    ? { min: toIndiaInput(currentSession.startDate), max: toIndiaInput(currentSession.endDate) }
    : null), [currentSession]);

  const applyState = (data) => {
    setWindowState(data);
    setDraft(toDraft(data));
    setShowProblems(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/registrations/window');
        applyState(response.data);
      } catch (error) {
        toast.error('Could not load the registration form settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateDraft = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const problems = draft ? problemsFor(draft, bounds) : {};
  const shown = showProblems ? problems : {};
  // "On" means switched on and not yet past its end date. A form whose phase has ended is set
  // up again like one that is off.
  const isOn = Boolean(windowState?.enabled) && ['live', 'scheduled'].includes(windowState?.phase);
  const livePhaseMissing = isOn && !windowState?.phaseName;
  const sessionEnded = Boolean(bounds) && bounds.max < nowIndia();
  const dirty = Boolean(draft && windowState) && JSON.stringify(draft) !== JSON.stringify(toDraft(windowState));

  // enabled: true opens (or keeps open) the form for this phase; false saves it with the form off
  const save = async ({ enabled, overrides = {}, success }) => {
    const next = { ...draft, ...overrides };
    const found = problemsFor(next, bounds);
    // A form that stays off may be saved half-filled, as a draft of the next phase
    const blocking = enabled ? found : {
      ...(found.registrationFee ? { registrationFee: found.registrationFee } : {}),
      ...(found.registrationSeries && String(next.registrationSeries || '').trim()
        ? { registrationSeries: found.registrationSeries }
        : {}),
    };
    if (Object.keys(blocking).length) {
      setDraft(next);
      setShowProblems(true);
      toast.error(Object.values(blocking)[0]);
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/registrations/window', {
        enabled,
        phaseName: next.phaseName,
        registrationSeries: next.registrationSeries,
        liveFrom: next.liveFromInput,
        disableAt: next.disableAtInput,
        registrationFee: next.registrationFee,
      });
      applyState(response.data);
      toast.success(success);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the registration form');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ame-orange border-t-transparent" />
      </div>
    );
  }

  if (!draft || !windowState) {
    return <p className="text-sm text-slate-900">Could not load the registration form settings.</p>;
  }

  const startsLater = draft.liveFromInput && draft.liveFromInput > nowIndia();
  const primaryLabel = isOn ? 'Save changes' : (startsLater ? 'Schedule this phase' : 'Open registration');
  const websiteUrl = `${String(import.meta.env.VITE_WEBSITE_URL || 'https://iiae.in').replace(/\/+$/, '')}/apply-online`;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <ClipboardList className="h-6 w-6 shrink-0 text-ame-orange" /> Registration Form
          </h2>
          <p className="mt-1 text-sm font-normal text-slate-900">
            Registration opens one exam phase at a time. Every registration belongs to the phase that was open when it came in.
          </p>
        </div>
        <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ame-orange hover:text-amber-700">
          Open student form <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {livePhaseMissing && (
        <div role="alert" className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">
              Registration is {windowState.phase === 'live' ? 'open' : 'scheduled'} without an exam phase.
            </span>{' '}
            It keeps working, but changes on this page can only be saved once you name the phase and set its dates
            inside the current session.
          </p>
        </div>
      )}

      {sessionEnded && (
        <div role="alert" className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">The current session, {currentSession.name}, ended on {formatIndia(currentSession.endDate, false)}.</span>{' '}
            A new phase has to fall inside the current session, so create the next session and mark it current first.{' '}
            <Link to="/dashboard/sessions" className="font-semibold underline underline-offset-2">Go to Sessions</Link>
          </p>
        </div>
      )}

      {!sessionsLoading && !currentSession && (
        <div role="alert" className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">No session is marked current.</span> Phase dates cannot be checked against a
            session, and students from an earlier session cannot register again.{' '}
            <Link to="/dashboard/sessions" className="font-semibold underline underline-offset-2">Go to Sessions</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-md border border-slate-300 bg-white lg:col-span-3" aria-labelledby="phase-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 id="phase-heading" className="text-base font-semibold text-slate-900">Exam phase</h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {isOn
                  ? `Changes apply to the phase that is ${windowState.phase === 'live' ? 'open now' : 'scheduled'}.`
                  : (windowState.phase === 'closed' ? 'The last phase has ended. Set up the next one.' : 'Set up the phase, then open registration.')}
              </p>
            </div>
            {currentSession && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                <CalendarRange className="h-3.5 w-3.5" /> {currentSession.name}{sessionEnded ? ' (ended)' : ''}
              </span>
            )}
          </div>

          <div className="space-y-4 p-5">
            <Field id="phase-name" label="Phase name" error={shown.phaseName}>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Phase 1"
                  value={draft.phaseName}
                  onChange={(event) => updateDraft('phaseName', event.target.value)}
                  className={inputClass(shown.phaseName)}
                />
              )}
            </Field>

            <Field id="registration-series" label="Registration ID series" error={shown.registrationSeries} className="sm:max-w-[240px]">
              {(props) => (
                <input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="2627"
                  value={draft.registrationSeries}
                  onChange={(event) => updateDraft('registrationSeries', event.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={inputClass(shown.registrationSeries)}
                />
              )}
            </Field>
            <p className="!mt-1.5 text-xs text-slate-600">
              Four digits on every new registration ID. 2627 means AIAEE 2026–27, so the first ID is IIAE/AIAEE/262700001. Each series counts from 00001.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phase-starts" label="Starts" error={shown.liveFromInput}>
                {(props) => (
                  <input
                    {...props}
                    type="datetime-local"
                    value={draft.liveFromInput}
                    min={bounds?.min}
                    max={bounds?.max}
                    onChange={(event) => updateDraft('liveFromInput', event.target.value)}
                    className={inputClass(shown.liveFromInput)}
                  />
                )}
              </Field>
              <Field id="phase-ends" label="Ends" error={shown.disableAtInput}>
                {(props) => (
                  <input
                    {...props}
                    type="datetime-local"
                    value={draft.disableAtInput}
                    min={draft.liveFromInput || bounds?.min}
                    max={bounds?.max}
                    onChange={(event) => updateDraft('disableAtInput', event.target.value)}
                    className={inputClass(shown.disableAtInput)}
                  />
                )}
              </Field>
            </div>
            <p className="text-xs text-slate-600">
              India time.{' '}
              {currentSession
                ? `Must fall inside ${currentSession.name} (${formatIndia(currentSession.startDate, false)} to ${formatIndia(currentSession.endDate, false)}).`
                : 'Mark a session as current to keep phases inside it.'}{' '}
              The form opens and closes on these dates by itself.
            </p>

            <Field id="registration-fee" label="Registration fee" error={shown.registrationFee} className="sm:max-w-[240px]">
              {(props) => (
                <div className="relative mt-1.5">
                  <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-normal text-slate-900">₹</span>
                  <input
                    {...props}
                    type="number"
                    min="0"
                    step="1"
                    value={draft.registrationFee}
                    onChange={(event) => updateDraft('registrationFee', event.target.value)}
                    className={`${inputClass(shown.registrationFee)} !mt-0 pl-8`}
                  />
                </div>
              )}
            </Field>
            <p className="!mt-1.5 text-xs text-slate-600">
              Charged on every registration in this phase, including a student registering again in a new session. Use 0 for no fee.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => save({ enabled: true, success: isOn ? 'Changes saved' : (startsLater ? 'The phase is scheduled' : 'Registration is open') })}
              disabled={saving || (isOn && !dirty)}
              className="btn-primary rounded-md !border-ame-orange !bg-ame-orange hover:!border-amber-600 hover:!bg-amber-600 disabled:opacity-60"
            >
              {isOn ? <Save className="h-4 w-4" /> : <Power className="h-4 w-4" />} {primaryLabel}
            </button>
            {!isOn && startsLater && (
              <button
                type="button"
                onClick={() => save({ enabled: true, overrides: { liveFromInput: nowIndia() }, success: 'Registration is open' })}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                Start now instead
              </button>
            )}
            {!isOn && dirty && (
              <button
                type="button"
                onClick={() => save({ enabled: false, success: 'Saved. Registration is still off.' })}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                Save without opening
              </button>
            )}
            {isOn && (
              <button
                type="button"
                onClick={() => save({ enabled: false, overrides: toDraft(windowState), success: 'Registration is closed' })}
                disabled={saving}
                className="ml-auto inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                <PowerOff className="h-4 w-4" /> Close registration now
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <section className="rounded-md border border-slate-300 bg-white p-5" aria-labelledby="status-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="status-heading" className="text-base font-semibold text-slate-900">Right now</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${statusStyle[windowState.phase] || statusStyle.disabled}`}>
                {statusLabel[windowState.phase] || 'Off'}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-900">{windowState.message}</p>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {[
                ['Session', currentSession ? currentSession.name : 'None marked current'],
                ['Exam phase', windowState.phaseName || 'Not set'],
                ['ID series', windowState.registrationSeries ? `IIAE/AIAEE/${windowState.registrationSeries}…` : 'Not set'],
                ['Starts', formatIndia(windowState.liveFrom)],
                ['Ends', formatIndia(windowState.disableAt)],
                ['Fee', `₹${Number(windowState.registrationFee || 0).toLocaleString('en-IN')}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700" aria-labelledby="rules-heading">
            <h3 id="rules-heading" className="text-sm font-semibold text-slate-900">How phases work</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>A student can register in only one phase per session.</li>
              <li>New registration IDs use the series set for this phase.</li>
              <li>Students who registered in an earlier session can register again for a phase in the current session, and pay the fee again.</li>
              <li>
                <Link to="/dashboard/registrations/unpaid" className="font-medium text-ame-orange hover:text-amber-700">Registrations</Link>{' '}
                can be filtered by phase.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RegistrationWindowPage;
