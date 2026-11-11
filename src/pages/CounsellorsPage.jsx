import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Users, Phone, Mail, BarChart3, Edit3, X, Key, Search, UserCheck, TrendingUp, GraduationCap } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';

const CounsellorsPage = () => {
  const [counsellors, setCounsellors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
  });

  useEffect(() => {
    fetchCounsellorData();
  }, []);

  const fetchCounsellorData = async () => {
    setLoading(true);
    try {
      const usersResponse = await api.get('/users');
      const filteredCounsellors = usersResponse.data.filter((u) => u.role === 'counsellor');

      // 2. Fetch leads to map allocations
      const leadsResponse = await api.get('/leads');
      setLeads(leadsResponse.data);
      setCounsellors(filteredCounsellors);
    } catch (error) {
      toast.error('Failed to load counsellors data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (counsellor) => {
    setSelectedUser(counsellor);
    setFormData({
      name: counsellor.name,
      email: counsellor.email,
      phone: counsellor.phone,
      password: '',
      status: counsellor.status || 'active',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      await api.put(`/users/${selectedUser._id}`, payload);
      toast.success('Counsellor account updated successfully');
      setIsEditOpen(false);
      fetchCounsellorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update counsellor account');
    }
  };

  // Helper to calculate statistics for a counsellor
  const getCounsellorStats = (userId) => {
    const assignedLeads = leads.filter(l => l.assignedTo?._id === userId);
    const convertedLeads = assignedLeads.filter(l => l.status === 'registered');
    const callbacks = assignedLeads.filter(l => l.status === 'callback');
    const rate = assignedLeads.length > 0 
      ? ((convertedLeads.length / assignedLeads.length) * 100).toFixed(1) 
      : 0;

    return {
      assigned: assignedLeads.length,
      converted: convertedLeads.length,
      callbacks: callbacks.length,
      rate: Number(rate)
    };
  };

  const rows = counsellors
    .map((c) => ({ counsellor: c, stats: getCounsellorStats(c._id) }))
    .filter(({ counsellor }) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [counsellor.name, counsellor.email, counsellor.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    })
    .sort((a, b) => b.stats.assigned - a.stats.assigned || a.counsellor.name.localeCompare(b.counsellor.name));

  const totals = counsellors.reduce(
    (acc, c) => {
      const stats = getCounsellorStats(c._id);
      acc.leads += stats.assigned;
      acc.admitted += stats.converted;
      return acc;
    },
    { leads: 0, admitted: 0 }
  );
  const overallRate = totals.leads > 0 ? ((totals.admitted / totals.leads) * 100).toFixed(1) : '0';

  const initials = (name = '') =>
    name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-ame-orange" /> Admissions Counsellors
          </h2>
          <p className="text-xs text-slate-500 mt-1">Lead load, admissions, and conversion for each counsellor.</p>
        </div>
        <Link to="/dashboard/meta-leads/report" className="btn-outline flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" /> Performance
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Counsellors', value: counsellors.length, icon: Users, tone: 'text-blue-600 bg-blue-50' },
          { label: 'Assigned leads', value: totals.leads, icon: UserCheck, tone: 'text-slate-700 bg-slate-100' },
          { label: 'Admitted', value: totals.admitted, icon: GraduationCap, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Conversion', value: `${overallRate}%`, icon: TrendingUp, tone: 'text-blue-600 bg-blue-50' },
        ].map((item) => (
          <div key={item.label} className="glass-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 leading-none">{loading ? '—' : item.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or phone"
              className="input-field pl-9"
            />
          </div>
          <p className="text-xs text-slate-500 sm:ml-auto">{loading ? '' : `${rows.length} shown`}</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No counsellors match that search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="brand-header">
                <tr className="font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4 text-left">Counsellor</th>
                  <th className="p-4 text-left">Contact</th>
                  <th className="p-4 text-right">Leads</th>
                  <th className="p-4 text-right">Admitted</th>
                  <th className="p-4 text-left w-40">Conversion</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ counsellor: c, stats }) => (
                  <tr key={c._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        
                        <div className="min-w-0">
                          <Link to={`/dashboard/meta-leads/report/${c._id}`} className="font-medium text-slate-900 truncate hover:text-blue-700 block capitalize">
                            {c.name}
                          </Link>
                          <span className={`text-[10px] uppercase tracking-wide font-semibold ${c.status === 'inactive' ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {c.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /> {c.email}</p>
                      <p className="flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5 shrink-0" /> {c.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{stats.assigned}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">{stats.converted}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(stats.rate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-700 w-12 text-right">{stats.rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEditClick(c)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit account"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Edit Counsellor Account
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500" /> New Password (Leave blank to keep current)
                </label>
                <PasswordInput
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set new password if changing"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounsellorsPage;
