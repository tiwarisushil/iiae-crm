import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Mail, Send, CheckCircle, Users, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const NewslettersPage = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'broadcast'

  // Broadcast Form States
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchSubscribers();
    }
  }, [activeTab]);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/newsletters');
      setSubscribers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!subject || !body) {
      toast.error('Subject and message body are required');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/newsletters/broadcast', { subject, body });
      toast.success(`${response.data.message} (${response.data.sentCount} emails queued)`);
      setSubject('');
      setBody('');
      setActiveTab('list');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to broadcast newsletter');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" /> Newsletter Campaigns
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review active subscription leads and dispatch broadcast notices to marketing circles.</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Subscribers List
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeTab === 'broadcast' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Compose Broadcast
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        /* Subscribers Roster List */
        <div className="max-w-2xl">
          <div className="p-4 border-b border-slate-200 shrink-0 text-slate-500 font-semibold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" /> Subscribers ({subscribers.length})
          </div>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                    <th className="p-4">Subscriber Email</th>
                    <th className="p-4">Subscription Date</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {subscribers.length > 0 ? (
                    subscribers.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-900">{s.email}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-center">
                          {s.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                              Unsubscribed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 font-semibold">
                        No newsletter subscriptions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Compose Broadcast View */
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-snug">Broadcast Newsletter Notice</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Send a simulated HTML email bulletin to all active subscribers.</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Subject Title *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Updates on IIAE Admissions 2026 Batch"
                required
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Message Body *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email newsletter content here..."
                required
                rows={8}
                className="input-field text-xs resize-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="btn-outline px-6 text-xs border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary px-6 text-xs flex items-center gap-1.5"
              >
                {sending ? 'Sending...' : 'Send Broadcast'} <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default NewslettersPage;
