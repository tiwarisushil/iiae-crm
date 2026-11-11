import React from 'react';
import { CalendarRange } from 'lucide-react';
import { useSession, ALL_SESSIONS, formatSessionRange } from '../context/SessionContext';

// Dropdown: pick which session's data every page shows.
const SessionSelector = ({ compact = false, block = false }) => {
  const { sessions, effectiveId, activeSession, selectSession, currentSessionId } = useSession();

  if (!sessions.length) return null;

  return (
    <label className={block ? 'block w-full' : 'flex items-center gap-2'} title={activeSession ? formatSessionRange(activeSession) : 'All sessions'}>
      {block ? (
        <span className="text-xs text-slate-900 font-bold uppercase tracking-wide">Session</span>
      ) : (
        <>
          <CalendarRange className="w-4 h-4 text-blue-600 shrink-0" />
          {!compact && (
            <span className="hidden sm:block text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Session</span>
          )}
        </>
      )}
      <select
        aria-label="Session"
        value={effectiveId}
        onChange={(event) => selectSession(event.target.value === ALL_SESSIONS ? ALL_SESSIONS : event.target.value)}
        className={`font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 cursor-pointer ${
          block ? 'mt-1.5 w-full px-2.5 py-2 text-sm text-slate-900' : 'px-2.5 py-1.5 max-w-[220px] text-xs text-slate-800'
        }`}
      >
        {sessions.map((session) => (
          <option key={session._id} value={String(session._id)}>
            {session.name}{String(session._id) === String(currentSessionId) ? ' (current)' : ''}
          </option>
        ))}
        <option value={ALL_SESSIONS}>All sessions</option>
      </select>
    </label>
  );
};

export default SessionSelector;
