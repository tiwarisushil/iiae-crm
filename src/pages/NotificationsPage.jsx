import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { NOTIFICATIONS_CHANGED, NotificationIcon, markNotificationsRead, timeAgo } from '../components/notifications/notificationUtils';

// Every notification of the signed-in staff member, newest activity first. Kept for 90 days.

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: PAGE_SIZE, ...(filter === 'unread' ? { unread: 1 } : {}) } });
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // New notifications or reads from the bell refresh the unread count
  useEffect(() => {
    const onChange = () => {
      api.get('/notifications', { params: { unread: 1, limit: 1 } })
        .then(({ data }) => setUnread(data.unread || 0))
        .catch(() => {});
    };
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
  }, []);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get('/notifications', {
        params: { limit: PAGE_SIZE, before: last.updatedAt, ...(filter === 'unread' ? { unread: 1 } : {}) },
      });
      setItems((current) => [...current, ...(data.notifications || [])]);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const markAll = async () => {
    try {
      const data = await markNotificationsRead({ all: true });
      setUnread(data.unread || 0);
      if (filter === 'unread') setItems([]);
      else setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not mark as read');
    }
  };

  const open = async (item) => {
    if (!item.read) {
      try {
        const data = await markNotificationsRead({ ids: [item._id] });
        setUnread(data.unread || 0);
        setItems((current) => current.map((entry) => (entry._id === item._id ? { ...entry, read: true } : entry)));
      } catch {
        // Still open the page
      }
    }
    if (item.link) navigate(item.link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-ame-orange" /> Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">What happened on the portal that concerns you. Kept for 90 days.</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} className="btn-primary flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCheck className="w-4.5 h-4.5" /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold">
        {[
          ['all', 'All'],
          ['unread', `Unread (${unread})`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg border cursor-pointer ${filter === value ? 'bg-ame-navy text-white border-ame-navy' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-500 font-semibold">
          {filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <ul>
            {items.map((item) => (
              <li key={item._id} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 cursor-pointer ${item.read ? '' : 'bg-amber-50/40'}`}
                >
                  <NotificationIcon type={item.type} className="w-9 h-9" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${item.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{item.title}</span>
                    {item.message && <span className="block text-xs text-slate-500 mt-0.5">{item.message}</span>}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(item.updatedAt)}</span>
                    {!item.read && <span className="w-2 h-2 rounded-full bg-rose-500" aria-label="Unread" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="p-3 text-center border-t border-slate-100">
              <button type="button" onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-60">
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Load older
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
