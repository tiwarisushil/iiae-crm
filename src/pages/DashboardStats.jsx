import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  PhoneCall,
  Users,
  IndianRupee,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Flame
} from 'lucide-react';
import { ResponsiveContainer, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';
import { statusBadgeClass } from '../utils/metaLeadStatus';

// Colours for the lead sources shown inside the overview cards
const SOURCE_STYLES = {
  meta: { label: 'Meta', bar: 'bg-blue-500' },
  manual: { label: 'Added', bar: 'bg-amber-500' },
  website: { label: 'Website', bar: 'bg-emerald-500' },
};

const ICON_STYLES = {
  amber: 'bg-amber-500/10 text-amber-600',
  blue: 'bg-blue-500/10 text-blue-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
};

// Stat card with a segmented bar and legend showing where the leads came from
const SourceStatCard = ({ label, value, sources = [], field, icon: Icon, color }) => {
  const total = sources.reduce((sum, src) => sum + (src[field] || 0), 0);
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value ?? 0}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ICON_STYLES[color] || ICON_STYLES.amber}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 gap-px">
          {total > 0 && sources.map((src) => {
            const count = src[field] || 0;
            if (!count) return null;
            const style = SOURCE_STYLES[src.key] || { label: src.label, bar: 'bg-slate-400' };
            return (
              <div
                key={src.key}
                className={`${style.bar} h-full`}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${style.label}: ${count}`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-x-3">
          {sources.map((src) => {
            const style = SOURCE_STYLES[src.key] || { label: src.label, bar: 'bg-slate-400' };
            return (
              <div key={src.key} className="space-y-0.5">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.bar}`} />
                  {style.label}
                </span>
                <p className="text-sm font-bold text-slate-800 tabular-nums pl-3">{src[field] || 0}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);
      } catch (error) {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // COLOR PALETTE FOR GRAPHS
  const COLORS = ['#eab308', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#6366f1'];
  // Tailwind colour names used by lead statuses -> bar colours
  const STATUS_COLORS = {
    slate: '#94a3b8', gray: '#9ca3af', red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308',
    lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
    blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', rose: '#f43f5e',
  };

  // 1. ADMIN & MANAGER VIEW
  const renderAdminStats = () => {
    const overview = stats?.overview || {};
    const breakdown = stats?.counsellorBreakdown || { statuses: [], counsellors: [] };
    const usedStatuses = breakdown.statuses.filter((st) => breakdown.counsellors.some((c) => c.statuses?.[st.key]));
    const counsellorData = breakdown.counsellors.map((c) => ({ name: c.name, total: c.total, ...c.statuses }));
    const leadsData = (overview.statusBreakdown || []).map((entry) => ({
      name: entry.name,
      value: entry.count,
      fill: STATUS_COLORS[entry.color] || null,
    }));

    return (
      <div className="space-y-6">
        {/* Live lead overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SourceStatCard label="Total Leads" value={overview.totalLeads} sources={overview.sources} field="total" icon={PhoneCall} color="amber" />
          <SourceStatCard label="Today's Leads" value={overview.todayLeads} sources={overview.sources} field="today" icon={Calendar} color="blue" />
          <SourceStatCard label="Leads in Pipeline" value={overview.pipelineLeads} sources={overview.sources} field="pipeline" icon={TrendingUp} color="emerald" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Registrations</p>
              <h3 className="text-2xl font-bold text-slate-900">{overview.registrations ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Counsellor workload */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leads by Counsellor</h4>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{breakdown.counsellors.length} Counsellors</span>
          </div>
          <div style={{ height: Math.max(220, 56 + counsellorData.length * 44) }}>
            {counsellorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counsellorData} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 4 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={140} interval={0} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value, name) => [`${value} Leads`, name]} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: 12 }} />
                  {usedStatuses.map((st, index) => (
                    <Bar
                      key={st.key}
                      dataKey={st.key}
                      name={st.name}
                      stackId="leads"
                      fill={STATUS_COLORS[st.color] || COLORS[index % COLORS.length]}
                      maxBarSize={26}
                      radius={index === usedStatuses.length - 1 ? [0, 6, 6, 0] : 0}
                      label={index === usedStatuses.length - 1 ? { dataKey: 'total', position: 'right', fontSize: 11, fontWeight: 'bold', fill: '#334155' } : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">
                {stats?.counsellorBreakdown ? 'No counsellors added yet' : 'Counsellor data unavailable - restart the backend server'}
              </div>
            )}
          </div>
        </div>

        {/* Graphs panel */}
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-card p-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Leads by Status</h4>
            <div className="h-64">
              {leadsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsData} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 4 }} barCategoryGap={10}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value} Leads`, 'Count']} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} label={{ position: 'right', fontSize: 11, fontWeight: 'bold', fill: '#334155' }}>
                      {leadsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No lead data recorded yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. TELECALLER VIEW
  const renderTelecallerStats = () => {
    const overview = stats?.overview || {};
    const strong = stats?.strongLeads || { total: 0, leads: [] };

    return (
      <div className="space-y-6">
        {/* Live lead overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SourceStatCard label="Total Leads" value={overview.totalLeads} sources={overview.sources} field="total" icon={PhoneCall} color="amber" />
          <SourceStatCard label="Today's Leads" value={overview.todayLeads} sources={overview.sources} field="today" icon={Calendar} color="blue" />
          <SourceStatCard label="Leads in Pipeline" value={overview.pipelineLeads} sources={overview.sources} field="pipeline" icon={TrendingUp} color="emerald" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Registrations</p>
              <h3 className="text-2xl font-bold text-slate-900">{overview.registrations ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Unpaid Registrations</p>
              <h3 className="text-2xl font-bold text-slate-900">{strong.total}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Flame className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Unpaid registrations assigned to this counsellor */}
        <div className="glass-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Flame className="h-4 w-4 text-rose-600" /> Unpaid registrations assigned to you
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">Registration form submitted, fee not paid yet. Follow these up first.</p>
            </div>
            <button type="button" onClick={() => navigate('/dashboard/registrations/unpaid')} className="btn-primary shrink-0">
              Open Unpaid Registrations <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          {strong.leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {strong.leads.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <p className="font-bold capitalize leading-tight text-slate-900">{row.lead?.fullName || 'Lead'}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                          {row.lead?.phone ? <a href={`tel:${row.lead.phone}`} className="hover:text-ame-orange">{row.lead.phone}</a> : (row.lead?.email || 'No contact details')}
                        </p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">{row.lead?.sourceLabel || '-'}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {row.currentStatus ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(row.currentStatus.color)}`}>
                            {row.currentStatus.name}
                          </span>
                        ) : <span className="text-xs text-slate-500">No status yet</span>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500">{new Date(row.assignedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {strong.total > strong.leads.length && (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  Showing the {strong.leads.length} most recent of {strong.total}. See all in Unpaid Registrations.
                </p>
              )}
            </div>
          ) : (
            <p className="p-8 text-center text-sm font-semibold text-slate-500">No unpaid registrations assigned to you right now.</p>
          )}
        </div>

        {/* Quick actions info */}
        <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Leads management dashboard active</h4>
            <p className="text-xs text-slate-500">You can add new candidates, log follow-up results, and track pending callbacks.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/leads')}
            className="btn-primary"
          >
            Open Leads Folder <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 3. ACCOUNTANT VIEW
  const renderAccountantStats = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Total Fees Collected</p>
              <h3 className="text-2xl font-bold text-slate-900">₹{stats?.finance?.totalCollected?.toLocaleString() || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Pending Balance outstanding</p>
              <h3 className="text-2xl font-bold text-slate-900 font-sans">₹{stats?.finance?.totalPendingFees?.toLocaleString() || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Receipts Log Count</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats?.finance?.totalPaymentsCount || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Recent payments table */}
        <div className="glass-card p-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Recent Transactions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Receipt Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats?.recentPayments?.length > 0 ? (
                  stats.recentPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{p.student?.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono font-semibold">{p.receiptNumber}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] uppercase font-bold">
                          {p.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 text-right">₹{p.amount.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold">No payments recorded recently</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 4. TEACHER VIEW
  const renderTeacherStats = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Assigned Batches</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats?.academics?.batchesCount || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">Total Class Strength</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats?.academics?.studentsCount || 0} Students</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Batches schedule summary */}
        <div className="glass-card p-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">My Batches List</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.batches?.length > 0 ? (
              stats.batches.map((b) => (
                <div key={b._id} className="glass-card p-4 flex flex-col justify-between transition-all">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-900">{b.name}</h5>
                    <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {b.schedule || 'Schedule not configured'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                    <span className="text-[11px] font-bold text-slate-500">{b.studentsCount} Enrolled Students</span>
                    <button
                      onClick={() => navigate('/dashboard/teacher/batches')}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                    >
                      View Students <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-slate-500 font-semibold">No active batches assigned to you</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Operational Dashboard</h2>
        <p className="text-xs text-slate-500 mt-1">Hello, {user?.name || 'User'}. Welcome to your department command module.</p>
      </div>

      {/* Render stats cards based on role */}
      {user?.role === 'admin' || user?.role === 'manager' ? renderAdminStats() : null}
      {user?.role === 'counsellor' ? renderTelecallerStats() : null}
      {user?.role === 'accountant' ? renderAccountantStats() : null}
      {user?.role === 'teacher' ? renderTeacherStats() : null}
    </div>
  );
};

export default DashboardStats;
