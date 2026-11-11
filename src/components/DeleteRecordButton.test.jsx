import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));
const authMock = vi.hoisted(() => ({ value: { user: { role: 'admin' } } }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => authMock.value }));
vi.mock('react-hot-toast', () => ({ toast: toastMock }));

import DeleteRecordButton from './DeleteRecordButton';

describe('DeleteRecordButton', () => {
  beforeEach(() => {
    authMock.value = { user: { role: 'admin' } };
    apiMock.post.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it('is shown only to admins', () => {
    authMock.value = { user: { role: 'manager' } };
    const { container } = render(<DeleteRecordButton kind="manual" id="l1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks first, warns it is permanent, then deletes the lead without blocking', async () => {
    const onDeleted = vi.fn();
    apiMock.post.mockResolvedValue({ data: { deleted: 1, blocked: 0 } });
    render(<DeleteRecordButton kind="meta" id="l1" name="Kabir" email="k@x.test" phone="9876500001" onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: /delete lead/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/removes from the crm/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/hidden, not erased/i)).toBeInTheDocument();
    expect(within(dialog).getByText('k@x.test')).toBeInTheDocument();
    expect(within(dialog).getByText('9876500001')).toBeInTheDocument();
    expect(within(dialog).getByText('Meta lead')).toBeInTheDocument();
    expect(within(dialog).getByRole('switch', { name: /also block this email and phone/i })).not.toBeChecked();
    // Cancel has focus, so Enter cannot delete by accident
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(apiMock.post).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete lead$/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/delete', { kind: 'meta', ids: ['l1'], block: false }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('blocks the email and phone when asked', async () => {
    apiMock.post.mockResolvedValue({ data: { deleted: 1, blocked: 2 } });
    render(<DeleteRecordButton kind="website" id="l1" email="spam@x.test" phone="9876500001" onDeleted={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /delete lead/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('switch', { name: /also block this email and phone/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /delete and block/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/delete', { kind: 'website', ids: ['l1'], block: true }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Lead deleted and blocked'));
  });

  it('keeps the row when the server keeps the lead', async () => {
    const onDeleted = vi.fn();
    apiMock.post.mockResolvedValue({ data: { deleted: 0, message: 'This lead has a registration. Delete the registration instead.' } });
    render(<DeleteRecordButton kind="website" id="l1" onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: /delete lead/i }));
    expect(within(screen.getByRole('dialog')).queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete lead$/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/delete the registration instead/i)));
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes a registration and says payments are kept', async () => {
    apiMock.post.mockResolvedValue({ data: { deleted: 1 } });
    render(<DeleteRecordButton compact kind="registration" id="s1" name="Riya" email="r@x.test" paid onDeleted={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /delete registration riya/i }));
    expect(within(screen.getByRole('dialog')).getByText(/payments are kept/i)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText(/their lead stays in the lead lists/i)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete registration$/i }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/leads/registrations/delete', { studentIds: ['s1'], block: false }));
  });

  it('opens outside the table cell, so its text is not right-aligned', () => {
    render(
      <table><tbody><tr><td className="text-right">
        <DeleteRecordButton compact kind="registration" id="s1" name="Riya" />
      </td></tr></tbody></table>
    );
    fireEvent.click(screen.getByRole('button', { name: /delete registration riya/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('td')).toBeNull();
    expect(dialog).toHaveClass('text-left');
  });
});
