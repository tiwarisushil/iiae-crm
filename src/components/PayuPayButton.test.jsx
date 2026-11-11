import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import api from '../utils/api';
import PayuPayButton, { registrationEndpoints } from './PayuPayButton';

const order = {
  paymentId: 'pay-doc-1',
  reference: 'IIAE-202610-ABCDEF1234',
  txnid: 'IIAE-202610-ABCDEF1234',
  status: 'created',
  amount: 50000,
  currency: 'INR',
  description: 'Exam registration fee',
  gateway: 'payu',
  action: 'https://test.payu.in/_payment',
  params: { key: 'k', txnid: 'IIAE-202610-ABCDEF1234', amount: '500.00', hash: 'a'.repeat(128) },
};

const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });

// Lets a test hold the order request open
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('PayuPayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state and disables the button while the transaction is created', async () => {
    const pending = deferred();
    api.post.mockReturnValueOnce(pending.promise);
    const submitForm = vi.fn();
    render(<PayuPayButton payableType="registration_fee" label="Pay registration fee" submitForm={submitForm} />);

    const button = screen.getByRole('button', { name: /pay registration fee/i });
    fireEvent.click(button);
    expect(await screen.findByRole('button', { name: /preparing/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/preparing secure checkout/i);

    // A second click while busy does nothing
    fireEvent.click(screen.getByRole('button', { name: /preparing/i }));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/online-payments/orders', { payableType: 'registration_fee' });

    pending.resolve({ data: order });
    await waitFor(() => expect(submitForm).toHaveBeenCalledTimes(1));
    expect(submitForm).toHaveBeenCalledWith(order);
    expect(screen.getByRole('button', { name: /redirecting to payu/i })).toBeDisabled();
  });

  it('shows the backend error when the transaction cannot be created', async () => {
    api.post.mockRejectedValueOnce(apiError(503, 'Online payments are not set up yet (PAYU_KEY still holds the placeholder value).'));
    const submitForm = vi.fn();
    render(<PayuPayButton payableType="registration_fee" submitForm={submitForm} />);
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    expect(await screen.findByText(/placeholder value/)).toBeInTheDocument();
    expect(submitForm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
  });

  it('never claims success itself: the outcome comes from the return page', async () => {
    api.post.mockResolvedValueOnce({ data: order });
    const submitForm = vi.fn();
    render(<PayuPayButton payableType="registration_fee" submitForm={submitForm} />);
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await waitFor(() => expect(submitForm).toHaveBeenCalled());
    expect(screen.queryByText(/received/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/taking you to payu/i);
  });

  it('reports a form error and offers a retry', async () => {
    api.post.mockResolvedValueOnce({ data: { ...order, action: 'https://evil.example/' } });
    render(<PayuPayButton payableType="registration_fee" submitForm={() => { throw new Error('Unexpected payment gateway address'); }} />);
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/gateway address/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
  });

  it('uses the token-scoped endpoints for the registration form', async () => {
    api.post.mockResolvedValueOnce({ data: order });
    render(<PayuPayButton payableType="registration_fee" endpoints={registrationEndpoints('tok')} submitForm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/online-payments/registration/tok/orders', { payableType: 'registration_fee' }));
  });
});
