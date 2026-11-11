import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

// Which admission session the signed-in user is viewing. The choice is stored in
// localStorage and sent on every API request as the X-Session-Id header (see utils/api.js).
// 'all' means no session filter; '' means "use the current session set by the admin".
export const SESSION_STORAGE_KEY = 'iiae_session';
export const ALL_SESSIONS = 'all';

const SessionContext = createContext(null);

export const readStoredSession = () => {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const storeSession = (value) => {
  try {
    if (value) localStorage.setItem(SESSION_STORAGE_KEY, value);
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // storage unavailable; the choice just lasts for this page load
  }
};

export const formatSessionRange = (session) => {
  if (!session) return '';
  const fmt = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(session.startDate)} - ${fmt(session.endDate)}`;
};

export const SessionProvider = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedId, setSelectedId] = useState(readStoredSession);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/sessions');
      const list = response.data?.sessions || [];
      setSessions(list);
      setCurrentSessionId(response.data?.currentSessionId ? String(response.data.currentSessionId) : null);
      // A stored session that no longer exists falls back to the admin's current one
      const stored = readStoredSession();
      if (stored && stored !== ALL_SESSIONS && !list.some((s) => String(s._id) === stored)) {
        storeSession('');
        setSelectedId('');
      }
      return list;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else {
      setSessions([]);
      setCurrentSessionId(null);
    }
  }, [user, refresh]);

  const selectSession = useCallback((value) => {
    const next = value === null || value === undefined ? '' : String(value);
    storeSession(next);
    setSelectedId(next);
  }, []);

  const value = useMemo(() => {
    const effectiveId = selectedId === ALL_SESSIONS
      ? ALL_SESSIONS
      : (selectedId || currentSessionId || ALL_SESSIONS);
    const activeSession = effectiveId === ALL_SESSIONS
      ? null
      : sessions.find((s) => String(s._id) === effectiveId) || null;
    return {
      sessions,
      currentSessionId,
      selectedId,
      effectiveId,
      activeSession,
      loading,
      selectSession,
      refresh,
    };
  }, [sessions, currentSessionId, selectedId, loading, selectSession, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    return {
      sessions: [], currentSessionId: null, selectedId: '', effectiveId: ALL_SESSIONS,
      activeSession: null, loading: false, selectSession: () => {}, refresh: async () => [],
    };
  }
  return context;
};
