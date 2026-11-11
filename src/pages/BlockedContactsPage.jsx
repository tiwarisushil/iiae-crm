import React, { useCallback, useEffect, useState } from 'react';
import { Ban, Mail, Phone, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';

const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

// Emails and phones no lead or registration can be added with (usually blocked while
// deleting a spam lead). Admins can block one by hand or unblock it.
const BlockedContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState({ value: '', reason: '' });
  const [adding, setAdding] = useState(false);
  const [unblocking, setUnblocking] = useState(null);

  const load = useCallback(async (query = '') => {
    try {
      const response = await api.get(`/blocked-contacts${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      setContacts(response.data?.contacts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load blocked contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  const add = async (event) => {
    event.preventDefault();
    if (!draft.value.trim()) return;
    setAdding(true);
    try {
      const response = await api.post('/blocked-contacts', { value: draft.value, reason: draft.reason });
      setContacts((current) => [response.data, ...current]);
      setDraft({ value: '', reason: '' });
      toast.success('Blocked');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not block');
    } finally {
      setAdding(false);
    }
  };

  const unblock = async () => {
    const contact = unblocking;
    setUnblocking(null);
    try {
      await api.delete(`/blocked-contacts/${contact._id}`);
      setContacts((current) => current.filter((item) => item._id !== contact._id));
      toast.success(`${contact.value} unblocked`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not unblock');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Ban className="h-5 w-5 text-ame-orange" /> Blocked Contacts
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          No lead or registration can be added with these emails and phone numbers: not from the website, Meta, Google Ads, imports or by hand.
        </p>
      </div>

      <form onSubmit={add} className="glass-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="block-value" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email or phone</label>
          <input id="block-value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="spam@example.com or 9876543210" className="input-field mt-1 py-2" />
        </div>
        <div>
          <label htmlFor="block-reason" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason (optional)</label>
          <input id="block-reason" value={draft.reason} maxLength={200} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="e.g. Spam enquiries" className="input-field mt-1 py-2" />
        </div>
        <button type="submit" disabled={adding || !draft.value.trim()} className="btn-primary justify-center px-4 py-2 text-xs disabled:opacity-60">
          <Ban className="h-4 w-4" /> {adding ? 'Blocking...' : 'Block'}
        </button>
      </form>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search blocked contacts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="input-field py-2 pl-9" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : contacts.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-500">{search ? 'Nothing matches this search.' : 'Nothing is blocked.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="brand-header">
                <tr className="text-[11px] font-semibold uppercase tracking-wide">
                  <th className="p-4">Email / phone</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Blocked</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        {contact.kind === 'email' ? <Mail className="h-4 w-4 text-slate-400" /> : <Phone className="h-4 w-4 text-slate-400" />}
                        <span className="break-all">{contact.value}</span>
                      </span>
                    </td>
                    <td className="p-4 text-xs">{contact.reason || '-'}</td>
                    <td className="p-4 text-xs whitespace-nowrap">
                      {formatDate(contact.createdAt)}{contact.blockedBy ? ` by ${contact.blockedBy}` : ''}
                    </td>
                    <td className="p-4 text-right">
                      <button type="button" onClick={() => setUnblocking(contact)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-ame-orange hover:text-ame-orange">
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(unblocking)}
        title={`Unblock ${unblocking?.value || ''}?`}
        message="Leads and registrations with it will be accepted again."
        confirmLabel="Unblock"
        tone="primary"
        onConfirm={unblock}
        onCancel={() => setUnblocking(null)}
      />
    </div>
  );
};

export default BlockedContactsPage;
