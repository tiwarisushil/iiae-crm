import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../utils/api', () => ({ default: apiMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NotificationBell from './NotificationBell';
import WhileYouWereAway from './WhileYouWereAway';
import NotificationsPage from '../../pages/NotificationsPage';
import { timeAgo } from './notificationUtils';

const now = new Date().toISOString();
const items = [
  { _id: 'n1', type: 'lead_new', title: '3 new website leads', message: 'Neha, Amit, Priya', link: '/dashboard/leads/website', read: false, updatedAt: now },
  { _id: 'n2', type: 'lead_assigned', title: 'A lead was assigned to you', message: 'Rahul · by Admin', link: '/dashboard/my-leads', read: true, updatedAt: now },
];

const withRouter = (ui) => render(
  <MemoryRouter initialEntries={['/dashboard/stats']}>
    <Routes>
      <Route path="/dashboard/stats" element={ui} />
      <Route path="/dashboard/leads/website" element={<p>Website leads page</p>} />
      <Route path="/dashboard/notifications" element={<p>Notifications page</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('timeAgo', () => {
  it('formats recent times compactly', () => {
    const base = Date.parse('2026-10-17T12:00:00Z');
    expect(timeAgo('2026-10-17T11:59:30Z', base)).toBe('just now');
    expect(timeAgo('2026-10-17T11:55:00Z', base)).toBe('5m ago');
    expect(timeAgo('2026-10-17T09:00:00Z', base)).toBe('3h ago');
    expect(timeAgo('2026-10-15T12:00:00Z', base)).toBe('2d ago');
  });
});

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockImplementation((url, { params } = {}) => Promise.resolve({
      data: params?.limit === 1 ? { notifications: [], unread: 1 } : { notifications: items, unread: 1 },
    }));
    apiMock.post.mockResolvedValue({ data: { updated: 1, unread: 0 } });
  });

  it('shows the unread count and opens a notification, marking it read', async () => {
    withRouter(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    fireEvent.click(bell);
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    fireEvent.click(await within(panel).findByText('3 new website leads'));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/notifications/read', { ids: ['n1'] }));
    expect(await screen.findByText('Website leads page')).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    withRouter(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Mark all read/ }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/notifications/read', { all: true }));
  });
});

describe('WhileYouWereAway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    apiMock.get.mockResolvedValue({
      data: { unread: 2, since: now, types: [{ type: 'lead_new', label: 'New leads', count: 12 }, { type: 'payment_received', label: 'Payments received', count: 3 }] },
    });
  });

  it('summarises unread activity once per sign-in', async () => {
    const { unmount } = withRouter(<WhileYouWereAway userId="u1" />);
    expect(await screen.findByRole('heading', { name: 'While you were away' })).toBeInTheDocument();
    expect(screen.getByText('New leads')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View notifications' }));
    expect(await screen.findByText('Notifications page')).toBeInTheDocument();
    unmount();

    withRouter(<WhileYouWereAway userId="u1" />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'While you were away' })).toBeNull();
  });

  it('stays hidden with nothing unread', async () => {
    apiMock.get.mockResolvedValue({ data: { unread: 0, since: null, types: [] } });
    withRouter(<WhileYouWereAway userId="u2" />);
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'While you were away' })).toBeNull();
  });
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockResolvedValue({ data: { notifications: items, unread: 1, hasMore: true } });
    apiMock.post.mockResolvedValue({ data: { updated: 1, unread: 0 } });
  });

  it('lists notifications, loads older ones and marks all read', async () => {
    withRouter(<NotificationsPage />);
    expect(await screen.findByText('3 new website leads')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unread (1)' })).toBeInTheDocument();

    apiMock.get.mockResolvedValueOnce({ data: { notifications: [{ ...items[1], _id: 'n3', title: 'Older one' }], unread: 1, hasMore: false } });
    fireEvent.click(screen.getByRole('button', { name: /Load older/ }));
    expect(await screen.findByText('Older one')).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenLastCalledWith('/notifications', { params: { limit: 20, before: now } });

    fireEvent.click(screen.getByRole('button', { name: /Mark all as read/ }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/notifications/read', { all: true }));
    expect(await screen.findByRole('button', { name: 'Unread (0)' })).toBeInTheDocument();
  });
});
