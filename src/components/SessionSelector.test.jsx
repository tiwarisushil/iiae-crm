import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(async () => ({
      data: {
        sessions: [
          { _id: 'a1', name: 'Session 24-25', startDate: '2024-03-01', endDate: '2025-02-01', isCurrent: false },
          { _id: 'b2', name: 'Session 25-26', startDate: '2025-03-01', endDate: '2026-02-01', isCurrent: true },
        ],
        currentSessionId: 'b2',
      },
    })),
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));

import { SessionProvider } from '../context/SessionContext';
import SessionSelector from './SessionSelector';

describe('SessionSelector', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to the current session and stores the choice for API requests', async () => {
    render(<SessionProvider><SessionSelector /></SessionProvider>);
    const select = await screen.findByLabelText('Session');
    await waitFor(() => expect(select.value).toBe('b2'));
    expect(screen.getByText('Session 25-26 (current)')).toBeTruthy();

    fireEvent.change(select, { target: { value: 'a1' } });
    expect(localStorage.getItem('iiae_session')).toBe('a1');

    fireEvent.change(select, { target: { value: 'all' } });
    expect(localStorage.getItem('iiae_session')).toBe('all');
  });
});
