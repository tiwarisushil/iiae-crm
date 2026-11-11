import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const authMock = vi.hoisted(() => ({ user: { role: 'admin' } }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdmitCardsPage from './AdmitCardsPage';

const SESSION = { _id: 's1', name: 'Winter', startDate: '2026-10-06T18:30:00.000Z', endDate: '2026-10-31T18:29:59.999Z' };
const closedPhase = {
  examPhase: 'Phase 1', registrations: 10, paid: 9, unpaid: 1, registrationOpen: false, canRelease: true,
  blockedReason: '', release: null, cardsIssued: 0, paidWithoutCard: 0,
};
const openPhase = {
  examPhase: 'Phase 2', registrations: 3, paid: 2, unpaid: 1, registrationOpen: true, canRelease: false,
  blockedReason: 'Registration for this phase is still open.', release: null, cardsIssued: 0, paidWithoutCard: 0,
};
const releasedPhase = {
  ...closedPhase,
  release: { _id: 'r1', examDate: '2026-11-19T18:30:00.000Z', startTime: '10:00', endTime: '13:00', examCenter: 'IIAE Campus', cardCount: 9, releasedAt: '2026-10-17T10:00:00Z', releasedBy: 'Admin' },
  cardsIssued: 9,
  paidWithoutCard: 1,
};

const DEFAULT_HTML = '<ol><li>Please preserve the print out of the Admit Card.</li></ol>';

const renderPage = () => render(<MemoryRouter><AdmitCardsPage /></MemoryRouter>);

describe('AdmitCardsPage', () => {
  beforeEach(() => {
    authMock.user = { role: 'admin' };
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    global.URL.createObjectURL = vi.fn(() => 'blob:x');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('offers release only for a phase whose registration has closed', async () => {
    apiMock.get.mockResolvedValue({ data: { session: SESSION, phases: [closedPhase, openPhase], downloadsEnabled: false } });
    renderPage();
    const phase1 = await screen.findByRole('region', { name: 'Phase 1' });
    expect(within(phase1).getByText('Ready to release')).toBeInTheDocument();
    expect(within(phase1).getByRole('button', { name: /release admit cards/i })).toBeInTheDocument();
    const phase2 = screen.getByRole('region', { name: 'Phase 2' });
    expect(within(phase2).getByText('Registration open')).toBeInTheDocument();
    expect(within(phase2).getByText(/still open/i)).toBeInTheDocument();
    expect(within(phase2).queryByRole('button')).not.toBeInTheDocument();
  });

  it('asks for the exam date and timing and releases without downloading', async () => {
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/admit-cards/phases') return { data: { session: SESSION, phases: [closedPhase], downloadsEnabled: false, defaultInstructionsHtml: DEFAULT_HTML } };
      if (url === '/admit-cards/releases/r1/pdf') return { data: new Blob(['%PDF']) };
      throw new Error(`unexpected GET ${url}`);
    });
    apiMock.post.mockResolvedValue({ data: { message: '9 admit card(s) released for Phase 1', releaseId: 'r1', cardCount: 9 } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /release admit cards/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/9/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Examination date'), { target: { value: '2099-11-20' } });
    fireEvent.change(within(dialog).getByLabelText('Starts at'), { target: { value: '13:00' } });
    fireEvent.change(within(dialog).getByLabelText('Ends at'), { target: { value: '10:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^release admit cards$/i }));
    expect(await within(dialog).findByText(/must end after it starts/i)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Starts at'), { target: { value: '10:00' } });
    fireEvent.change(within(dialog).getByLabelText('Ends at'), { target: { value: '13:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^release admit cards$/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/admit-cards/release', {
      examPhase: 'Phase 1', examDate: '2099-11-20', startTime: '10:00', endTime: '13:00',
      instructionsHtml: DEFAULT_HTML,
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Releasing does not download anything; the list is reloaded instead
    expect(apiMock.get).not.toHaveBeenCalledWith('/admit-cards/releases/r1/pdf', { responseType: 'blob' });
    expect(apiMock.get.mock.calls.filter(([url]) => url === '/admit-cards/phases')).toHaveLength(2);
  });

  it('shows a released phase with its timing, late payers and a download', async () => {
    apiMock.get.mockResolvedValue({ data: { session: SESSION, phases: [releasedPhase], downloadsEnabled: true } });
    renderPage();
    const phase1 = await screen.findByRole('region', { name: 'Phase 1' });
    expect(within(phase1).getByText('Released')).toBeInTheDocument();
    expect(within(phase1).getByText('10:00 am to 1:00 pm')).toBeInTheDocument();
    expect(within(phase1).getByText(/1 student has paid since the release/i)).toBeInTheDocument();
    expect(within(phase1).getByRole('button', { name: /update release/i })).toBeInTheDocument();
    expect(within(phase1).getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('lets a manager download but not release', async () => {
    authMock.user = { role: 'manager' };
    apiMock.get.mockResolvedValue({ data: { session: SESSION, phases: [releasedPhase, closedPhase], downloadsEnabled: true } });
    renderPage();
    await screen.findAllByRole('region');
    expect(screen.queryByRole('button', { name: /release admit cards|update release/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('warns when students cannot see released cards', async () => {
    apiMock.get.mockResolvedValue({ data: { session: SESSION, phases: [releasedPhase], downloadsEnabled: false } });
    renderPage();
    expect(await screen.findByText(/student downloads are turned off/i)).toBeInTheDocument();
  });

  it('asks only for the date, timing and instructions, with the standard instructions ready to edit', async () => {
    apiMock.get.mockResolvedValue({ data: { session: SESSION, phases: [closedPhase], downloadsEnabled: true, defaultInstructionsHtml: DEFAULT_HTML } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /release admit cards/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/please preserve the print out/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/exam center|venue|offline/i)).not.toBeInTheDocument();
  });
});
