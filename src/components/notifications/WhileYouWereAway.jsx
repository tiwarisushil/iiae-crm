import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../../utils/api';
import { NotificationIcon, markNotificationsRead, timeAgo } from './notificationUtils';

// Shown once per sign-in (per browser tab session) when the user has unread notifications:
// a short summary of what happened on the portal since they were last here.

const seenKey = (userId) => {
  let token = '';
  try {
    token = localStorage.getItem('iiae_token') || '';
  } catch {
    // No storage: fall back to the user id alone
  }
  return `iiae_away_summary_${userId}_${token.slice(-16)}`;
};

const readSeen = (userId) => {
  try {
    return sessionStorage.getItem(seenKey(userId)) === '1';
  } catch {
    return false;
  }
};

const writeSeen = (userId) => {
  try {
    sessionStorage.setItem(seenKey(userId), '1');
  } catch {
    // Private mode: the summary may show again on the next page load
  }
};

export default function WhileYouWereAway({ userId }) {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || readSeen(userId)) return undefined;
    let cancelled = false;
    api.get('/notifications/summary')
      .then(({ data }) => {
        if (cancelled) return;
        writeSeen(userId);
        if (data.unread > 0) setSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!summary) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setSummary(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary]);

  if (!summary) return null;

  const close = () => setSummary(null);
  const viewAll = () => {
    close();
    navigate('/dashboard/notifications');
  };
  const markAll = async () => {
    close();
    try {
      await markNotificationsRead({ all: true });
    } catch {
      // The bell still shows them
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="away-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <h2 id="away-title" className="text-lg font-bold text-slate-900">While you were away</h2>
        {summary.since && <p className="text-xs text-slate-500 mt-0.5">Since {timeAgo(summary.since)}</p>}
        <ul className="mt-4 space-y-2">
          {summary.types.map((row) => (
            <li key={row.type} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
              <NotificationIcon type={row.type} />
              <span className="flex-1 text-sm font-semibold text-slate-800">{row.label}</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={markAll} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
            Mark all as read
          </button>
          <button type="button" onClick={viewAll} className="btn-primary">
            View notifications
          </button>
        </div>
      </div>
    </div>
  );
}
