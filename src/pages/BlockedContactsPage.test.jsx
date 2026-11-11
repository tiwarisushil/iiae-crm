import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BlockedContactsPage from './BlockedContactsPage';

const ROWS = [
  { _id: 'b1', kind: 'email', value: 'spam@x.test', reason: 'Deleted manual lead', blockedBy: 'Admin', createdAt: '2026-10-17T10:00:00Z' },
  { _id: 'b2', kind: 'phone', value: '9876500001', reason: '', blockedBy: '', createdAt: '2026-10-17T10:00:00Z' },
];

describe('BlockedContactsPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue({ data: { contacts: ROWS } });
    apiMock.post.mockReset();
    apiMock.delete.mockReset();
  });

  it('lists, blocks by hand and unblocks', async () => {
    render(<BlockedContactsPage />);
    expect(await screen.findByText('spam@x.test')).toBeInTheDocument();
    expect(screen.getByText('9876500001')).toBeInTheDocument();

    apiMock.post.mockResolvedValue({ data: { _id: 'b3', kind: 'phone', value: '9876543210', reason: 'Calls', createdAt: '2026-10-17T11:00:00Z' } });
    fireEvent.change(screen.getByLabelText('Email or phone'), { target: { value: '+91 98765 43210' } });
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Calls' } });
    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/blocked-contacts', { value: '+91 98765 43210', reason: 'Calls' }));
    expect(await screen.findByText('9876543210')).toBeInTheDocument();

    apiMock.delete.mockResolvedValue({ data: {} });
    const row = screen.getByText('spam@x.test').closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: /unblock/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^unblock$/i }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/blocked-contacts/b1'));
    await waitFor(() => expect(screen.queryByText('spam@x.test')).not.toBeInTheDocument());
  });
});
