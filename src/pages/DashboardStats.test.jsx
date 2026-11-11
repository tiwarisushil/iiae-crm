import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'counsellor', name: 'Asha' } }) }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import DashboardStats from './DashboardStats';

const overview = { totalLeads: 3, todayLeads: 0, pipelineLeads: 3, registrations: 1, sources: [] };

const renderWith = (strongLeads) => {
  apiMock.get.mockResolvedValue({ data: { overview, leads: { total: 0 }, strongLeads } });
  return render(<MemoryRouter><DashboardStats /></MemoryRouter>);
};

describe('counsellor dashboard unpaid registrations', () => {
  beforeEach(() => apiMock.get.mockReset());

  it('lists the unpaid registrations assigned to the counsellor', async () => {
    renderWith({
      total: 12,
      leads: [
        { _id: 'a1', assignedAt: '2026-10-17T05:00:00Z', currentStatus: null, lead: { fullName: 'Riya', phone: '9876500001', sourceLabel: 'Meta', isStrongLead: true } },
        { _id: 'a2', assignedAt: '2026-10-16T05:00:00Z', currentStatus: { name: 'Callback', color: 'amber' }, lead: { fullName: 'Kabir', email: 'k@example.test', sourceLabel: 'Website', isStrongLead: true } },
      ],
    });
    expect(await screen.findByText('Unpaid registrations assigned to you')).toBeInTheDocument();
    expect(screen.getByText('No status yet')).toBeInTheDocument();
    expect(screen.queryByText(/strong/i)).not.toBeInTheDocument();
    expect(screen.getByText('Riya')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '9876500001' })).toHaveAttribute('href', 'tel:9876500001');
    expect(screen.getByText('Callback')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/most recent of 12/)).toBeInTheDocument();
  });

  it('says so when there are none, including for an older API without the field', async () => {
    renderWith(undefined);
    expect(await screen.findByText('No unpaid registrations assigned to you right now.')).toBeInTheDocument();
  });
});
