import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
const sessionMock = vi.hoisted(() => ({ value: null }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('../context/SessionContext', () => ({ useSession: () => sessionMock.value }));
vi.mock('react-hot-toast', () => ({ toast: toastMock }));

import RegistrationWindowPage from './RegistrationWindowPage';

// Session 26-27: 01 Mar 2026 to 28 Feb 2027 (India days)
const SESSION = { _id: 'ses1', name: 'Session 26-27', startDate: '2026-02-28T18:30:00.000Z', endDate: '2027-02-28T18:29:59.999Z' };

const windowData = (overrides = {}) => ({
  open: false, phase: 'disabled', message: 'Registration is turned off.', enabled: false,
  phaseName: '', liveFrom: null, disableAt: null, liveFromInput: '', disableAtInput: '', registrationFee: 500,
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><RegistrationWindowPage /></MemoryRouter>);

describe('RegistrationWindowPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.put.mockReset();
    toastMock.error.mockReset();
    sessionMock.value = { sessions: [SESSION], currentSessionId: 'ses1', loading: false };
  });

  it('asks for the phase details before opening registration, with the reason under each field', async () => {
    apiMock.get.mockResolvedValue({ data: windowData() });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /open registration/i }));
    expect(await screen.findByText(/enter the phase name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter the 4-digit series/i)).toBeInTheDocument();
    expect(screen.getByText(/choose when the phase starts/i)).toBeInTheDocument();
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('keeps phase dates inside the current session', async () => {
    apiMock.get.mockResolvedValue({ data: windowData() });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Phase name'), { target: { value: 'Phase 1' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-04-01T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2027-03-15T18:00' } });
    expect(screen.getByLabelText('Starts')).toHaveAttribute('min', '2026-03-01T00:00');
    expect(screen.getByLabelText('Ends')).toHaveAttribute('max', '2027-02-28T23:59');
    fireEvent.click(screen.getByRole('button', { name: /schedule this phase|open registration/i }));
    expect(await screen.findByText(/the current session ends on/i)).toBeInTheDocument();
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('opens registration for a phase with its dates and fee', async () => {
    apiMock.get.mockResolvedValue({ data: windowData() });
    apiMock.put.mockResolvedValue({ data: windowData({ enabled: true, open: true, phase: 'live', phaseName: 'Phase 1' }) });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Phase name'), { target: { value: 'Phase 1' } });
    fireEvent.change(screen.getByLabelText('Registration ID series'), { target: { value: '2627' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-03-02T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-12-31T18:00' } });
    fireEvent.change(screen.getByLabelText('Registration fee'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /open registration|schedule this phase/i }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/registrations/window', {
      enabled: true, phaseName: 'Phase 1', registrationSeries: '2627', liveFrom: '2026-03-02T09:00', disableAt: '2026-12-31T18:00', registrationFee: '750',
    }));
  });

  it('flags a live form that has no phase yet and saves once the phase is filled in', async () => {
    apiMock.get.mockResolvedValue({ data: windowData({ enabled: true, open: true, phase: 'live', message: 'The registration form is live.' }) });
    apiMock.put.mockResolvedValue({ data: windowData({ enabled: true, open: true, phase: 'live', phaseName: 'Phase 1' }) });
    renderPage();
    expect(await screen.findByText(/registration is open without an exam phase/i)).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Registration fee'), { target: { value: '600' } });
    fireEvent.click(saveButton);
    expect(await screen.findByText(/enter the phase name/i)).toBeInTheDocument();
    expect(apiMock.put).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Phase name'), { target: { value: 'Phase 1' } });
    fireEvent.change(screen.getByLabelText('Registration ID series'), { target: { value: '2627' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-03-02T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-12-31T18:00' } });
    fireEvent.click(saveButton);
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    expect(apiMock.put.mock.calls[0][1]).toMatchObject({ enabled: true, phaseName: 'Phase 1', registrationSeries: '2627', registrationFee: '600' });
  });

  it('closes registration without asking for anything', async () => {
    apiMock.get.mockResolvedValue({ data: windowData({ enabled: true, open: true, phase: 'live' }) });
    apiMock.put.mockResolvedValue({ data: windowData() });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /close registration now/i }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/registrations/window', expect.objectContaining({ enabled: false })));
  });

  it('warns when no session is marked current', async () => {
    sessionMock.value = { sessions: [SESSION], currentSessionId: null, loading: false };
    apiMock.get.mockResolvedValue({ data: windowData() });
    renderPage();
    expect(await screen.findByText(/no session is marked current/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to sessions/i })).toHaveAttribute('href', '/dashboard/sessions');
  });

  it('treats a form whose phase has ended as ready for the next phase', async () => {
    apiMock.get.mockResolvedValue({ data: windowData({ enabled: true, phase: 'closed', message: 'Registration closed on 17 Oct 2026, 3:33 pm.' }) });
    renderPage();
    expect(await screen.findByText(/the last phase has ended/i)).toBeInTheDocument();
    expect(screen.queryByText(/without an exam phase/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close registration now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open registration|schedule this phase/i })).toBeEnabled();
  });

  it('says when the current session has already ended', async () => {
    sessionMock.value = {
      sessions: [{ _id: 'w', name: 'Winter', startDate: '2020-10-06T18:30:00.000Z', endDate: '2020-10-09T18:29:59.999Z' }],
      currentSessionId: 'w',
      loading: false,
    };
    apiMock.get.mockResolvedValue({ data: windowData() });
    renderPage();
    expect(await screen.findByText(/the current session, winter, ended on/i)).toBeInTheDocument();
  });
});
