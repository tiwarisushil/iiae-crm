import React from 'react';
import { Bell, UserPlus, Users, UserMinus, UserCheck, FileCheck2, IndianRupee } from 'lucide-react';
import api from '../../utils/api';

// Shared by the header bell, the Notifications page and the "While you were away" summary.
// API: /api/notifications (see Nodejs/src/services/notifications.js for who gets what).

// Fired after notifications are read anywhere, so the bell and the page refresh their counts.
export const NOTIFICATIONS_CHANGED = 'iiae:notifications-changed';
export const announceNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

const ICONS = {
  lead_new: { Icon: UserPlus, tone: 'bg-sky-50 text-sky-600' },
  lead_assigned: { Icon: Users, tone: 'bg-indigo-50 text-indigo-600' },
  lead_unassigned: { Icon: UserMinus, tone: 'bg-slate-100 text-slate-500' },
  registration_assigned: { Icon: FileCheck2, tone: 'bg-indigo-50 text-indigo-600' },
  registration_unassigned: { Icon: FileCheck2, tone: 'bg-slate-100 text-slate-500' },
  lead_registered: { Icon: UserCheck, tone: 'bg-violet-50 text-violet-600' },
  registration_submitted: { Icon: FileCheck2, tone: 'bg-amber-50 text-amber-600' },
  payment_received: { Icon: IndianRupee, tone: 'bg-emerald-50 text-emerald-600' },
};

export const NotificationIcon = ({ type, className = 'w-8 h-8' }) => {
  const { Icon, tone } = ICONS[type] || { Icon: Bell, tone: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`${className} ${tone} rounded-full flex items-center justify-center shrink-0`}>
      <Icon className="w-4 h-4" />
    </span>
  );
};

/** "just now", "5m ago", "3h ago", "2d ago", then the date. */
export const timeAgo = (value, now = Date.now()) => {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const markNotificationsRead = async (body) => {
  const { data } = await api.post('/notifications/read', body);
  announceNotificationsChanged();
  return data;
};
