import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const authMock = vi.hoisted(() => ({ user: { role: 'admin' } }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RegistrationsPage from './RegistrationsPage';

const students = [
  { _id: 's1', name: 'Riya', email: 'riya@example.test', phone: '9876500001', createdAt: '2026-10-01T10:00:00Z', profile: { registrationFeePaid: false }, lead: { source: 'META', _id: 'l1', assignedTo: null } },
  { _id: 's2', name: 'Kabir', email: 'kabir@example.test', phone: '9876500002', createdAt: '2026-10-02T10:00:00Z', profile: { registrationFeePaid: false }, lead: { source: 'WEBSITE', _id: 'l2', assignedTo: { _id: 'c2', name: 'Bilal' } } },
];

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <RegistrationsPage />
  </MemoryRouter>
);

describe('RegistrationsPage unpaid registrations', () => {
  beforeEach(() => {
    authMock.user = { role: 'admin' };
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/users?role=student&registrationFeePaid=false') return { data: students };
      if (url === '/users?role=counsellor') return { data: [{ _id: 'c1', name: 'Asha' }, { _id: 'c2', name: 'Bilal' }, { _id: 'c3', name: 'Off', status: 'inactive' }] };
      if (url === '/leads/registrations/s1') {
        return { data: {
          student: { _id: 's1', name: 'Riya', phone: '9876500001', email: 'riya@example.test' },
          registration: { studentId: '', course: 'AME', submittedAt: '2026-10-01T10:00:00Z', feeAmount: 1500, feePaid: false, registeredBy: '' },
          lead: { source: 'META', sourceLabel: 'Meta', assignedTo: null, createdAt: '2026-09-30T10:00:00Z' },
          remarks: [{ remark: 'Did not pick up', caller: 'Asha', date: '2026-10-02T10:00:00Z' }],
        } };
      }
      throw new Error(`unexpected GET ${url}`);
    });
  });

  it('lists unpaid registrations without a strong-lead tag', async () => {
    renderAt('/dashboard/registrations/unpaid');
    expect(await screen.findByText('Riya')).toBeInTheDocument();
    expect(screen.queryByText(/strong lead/i)).not.toBeInTheDocument();
  });

  it('lets an admin pick each registration\'s counsellor from a dropdown', async () => {
    apiMock.post.mockResolvedValue({ data: { message: '1 registration(s) assigned to Asha' } });
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');

    const riya = screen.getByLabelText('Counsellor for Riya');
    expect(riya).toHaveValue('');
    expect(screen.getByLabelText('Counsellor for Kabir')).toHaveValue('c2');
    // One per row plus the counsellor filter
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Asha' })).toHaveLength(3));
    expect(screen.queryByRole('option', { name: 'Off' })).not.toBeInTheDocument();

    fireEvent.change(riya, { target: { value: 'c1' } });
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/registrations/assign', { studentIds: ['s1'], counsellorId: 'c1' }));
    await waitFor(() => expect(screen.getByLabelText('Counsellor for Riya')).toHaveValue('c1'));

    fireEvent.change(screen.getByLabelText('Counsellor for Kabir'), { target: { value: '' } });
    await waitFor(() => expect(apiMock.post).toHaveBeenLastCalledWith('/leads/registrations/assign', { studentIds: ['s2'], counsellorId: null }));
  });

  it('counsellors see their unpaid registrations but cannot assign', async () => {
    authMock.user = { role: 'counsellor' };
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');
    expect(screen.getByText('Kabir')).toBeInTheDocument();
    expect(screen.queryByLabelText('Counsellor for Riya')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark .+ paid/i })).not.toBeInTheDocument();
    expect(screen.getByText('Bilal')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('filters by counsellor and shows the latest remark', async () => {
    apiMock.get.mockImplementationOnce(async () => ({ data: [
      { ...students[0], lastRemark: { remark: 'Will pay Monday', caller: 'Asha', date: '2026-10-03T10:00:00Z' } },
      students[1],
    ] }));
    renderAt('/dashboard/registrations/unpaid');
    expect(await screen.findByText('Will pay Monday')).toBeInTheDocument();
    expect(screen.getByText('No remarks yet')).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Bilal' }).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText('Filter by counsellor'), { target: { value: 'c2' } });
    expect(screen.queryByText('Riya')).not.toBeInTheDocument();
    expect(screen.getByText('Kabir')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by counsellor'), { target: { value: 'none' } });
    expect(screen.getByText('Riya')).toBeInTheDocument();
    expect(screen.queryByText('Kabir')).not.toBeInTheDocument();
  });

  it('opens a registration\'s details and saves a remark', async () => {
    authMock.user = { role: 'counsellor' };
    apiMock.post.mockResolvedValue({ data: { remarks: [
      { remark: 'Called, paying tomorrow', caller: 'Asha', date: '2026-10-04T10:00:00Z' },
      { remark: 'Did not pick up', caller: 'Asha', date: '2026-10-02T10:00:00Z' },
    ] } });
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');
    fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Registration details' });
    expect(await within(dialog).findByText('Did not pick up')).toBeInTheDocument();
    expect(within(dialog).getByText(/₹1,500/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open the full registration form' })).toHaveAttribute('href', '/dashboard/registrations/student/s1');

    fireEvent.change(within(dialog).getByLabelText('Add remark'), { target: { value: '  Called, paying tomorrow ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /save remark/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/registrations/s1/remarks', { remark: 'Called, paying tomorrow' }));
    expect(await within(dialog).findByText('Remarks (2)')).toBeInTheDocument();
    // The list row shows the new latest remark
    expect(screen.getAllByText('Called, paying tomorrow').length).toBe(2);
  });

  it('lets an admin delete a registration from the list', async () => {
    apiMock.post.mockResolvedValue({ data: { deleted: 1 } });
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');
    fireEvent.click(screen.getByRole('button', { name: 'Delete registration Riya' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete registration$/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/registrations/delete', { studentIds: ['s1'], block: false }));
    await waitFor(() => expect(screen.queryByText('Riya')).not.toBeInTheDocument());
    expect(screen.getByText('Kabir')).toBeInTheDocument();
  });

  it('does not offer delete to managers or counsellors', async () => {
    authMock.user = { role: 'manager' };
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');
    expect(screen.queryByRole('button', { name: /delete registration/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark .+ paid/i })).not.toBeInTheDocument();
  });

  it('lets an admin mark a registration paid and removes it from the unpaid list', async () => {
    apiMock.post.mockResolvedValue({ data: { message: 'Registration marked paid', registrationFeePaid: true } });
    renderAt('/dashboard/registrations/unpaid');
    await screen.findByText('Riya');
    expect(screen.getAllByRole('button', { name: /mark .+ paid/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Riya paid' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark registration paid' });
    fireEvent.change(within(dialog).getByLabelText('Note (optional)'), { target: { value: 'Cash at the counter' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark paid' }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/registrations/s1/mark-paid', { note: 'Cash at the counter' }));
    await waitFor(() => expect(screen.queryByText('Riya')).not.toBeInTheDocument());
    expect(screen.getByText('Kabir')).toBeInTheDocument();
  });
});
