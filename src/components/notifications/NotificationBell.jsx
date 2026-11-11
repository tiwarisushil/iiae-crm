import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../../utils/api';
import { NOTIFICATIONS_CHANGED, NotificationIcon, markNotificationsRead, timeAgo } from './notificationUtils';

// Header bell: unread count (refreshed every minute and when the tab regains focus) and a
// panel with the latest notifications. Opening one marks it read.

export const POLL_MS = 60 * 1000;
const PANEL_LIMIT = 8;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { unread: 1, limit: 1 } });
      setUnread(data.unread || 0);
    } catch {
      // Keep the last count; the next poll tries again
    }
  }, []);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: PANEL_LIMIT } });
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED, onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onFocus);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadPanel();
    const onClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, loadPanel]);

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      try {
        await markNotificationsRead({ ids: [item._id] });
      } catch {
        // Opening the page matters more than the read flag
      }
    }
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    try {
      const data = await markNotificationsRead({ all: true });
      setUnread(data.unread || 0);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      // Leave the list as it is
    }
  };

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative p-2 rounded-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-sm border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${item.read ? '' : 'bg-amber-50/40'}`}
                    >
                      <NotificationIcon type={item.type} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm truncate ${item.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{item.title}</span>
                        {item.message && <span className="block text-xs text-slate-500 truncate">{item.message}</span>}
                        <span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(item.updatedAt)}</span>
                      </span>
                      {!item.read && <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link to="/dashboard/notifications" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 border-t border-slate-100">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
