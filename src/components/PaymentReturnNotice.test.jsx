import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../utils/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import api from '../utils/api';
import PaymentReturnNotice from './PaymentReturnNotice';

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
};

const renderAt = (search, props = {}) =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/student/payments${search}`]}>
      <Routes>
        <Route path="/dashboard/student/payments" element={<><PaymentReturnNotice {...props} /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );

const paid = { _id: 'p1', status: 'paid', amount: 50000, currency: 'INR', reference: 'IIAE-202610-ABCDEF1234', payuPaymentId: '403993715521937565' };

describe('PaymentReturnNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing without a return result', () => {
    renderAt('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('shows the stored payment, calls onPaid once and cleans the URL', async () => {
    api.get.mockResolvedValueOnce({ data: paid });
    const onPaid = vi.fn();
    renderAt('?payment=p1&result=paid&tab=history', { onPaid });
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
    expect(screen.getByText(/₹500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/403993715521937565/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/online-payments/p1');
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=history');
  });

  it('does not trust the query string: result=paid with an unpaid record shows pending', async () => {
    api.get.mockResolvedValueOnce({ data: { ...paid, status: 'created', payuPaymentId: null } });
    const onPaid = vi.fn();
    renderAt('?payment=p1&result=paid', { onPaid });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(await screen.findByText(/being confirmed/i)).toBeInTheDocument();
    expect(onPaid).not.toHaveBeenCalled();

    // Check status reconciles with PayU and then shows the confirmed result
    api.get.mockResolvedValueOnce({ data: paid });
    fireEvent.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/online-payments/p1', { params: { sync: 'true' } });
    expect(onPaid).toHaveBeenCalledTimes(1);
  });

  it('shows the failure reason and no check button for a failed payment', async () => {
    api.get.mockResolvedValueOnce({ data: { ...paid, status: 'failed', failure: { description: 'Bank declined' } } });
    renderAt('?payment=p1&result=failed');
    expect(await screen.findByText(/bank declined/i)).toBeInTheDocument();
    expect(screen.getByText(/payment not completed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check status/i })).not.toBeInTheDocument();
  });

  it('explains an unverifiable response and can be dismissed', async () => {
    renderAt('?result=invalid');
    expect(await screen.findByText(/could not be verified/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
