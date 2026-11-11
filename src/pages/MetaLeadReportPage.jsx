import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { BarChart3, Inbox, UserX, UserCheck, PhoneCall, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { statusBadgeClass } from '../utils/metaLeadStatus';

// Per-counsellor performance across Meta, website, uploaded, and form leads
const MetaLeadReportPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      // Whole days in the user's own timezone
      if (fromDate) params.from = new Date(`${fromDate}T00:00:00`).toISOString();
      if (toDate) params.to = new Date(`${toDate}T23:59:59.999`).toISOString();

      const response = await api.get('/integrations/meta/reports/telecallers', { params });
      setReport(response.data);
    } catch (error) {
      toast.error('Failed to load the performance report');
    } finally {
      setLoading(false);
    }
  };

  const telecallers = report?.telecallers || [];
  const sum = (key) => telecallers.reduce((total, t) => total + t[key], 0);
  const assignedTotal = sum('totalAssigned');
  const convertedTotal = sum('converted');

  const tiles = report
    ? [
        { label: 'Leads', value: report.totalLeads, icon: Inbox, tone: 'text-blue-600 bg-blue-50' },
        { label: 'Unassigned', value: report.unassignedLeads, icon: UserX, tone: 'text-slate-700 bg-slate-100' },
        { label: 'Active with counsellors', value: sum('activeLeads'), icon: UserCheck, tone: 'text-emerald-600 bg-emerald-50' },
        { label: 'Worked', value: sum('workedLeads'), icon: PhoneCall, tone: 'text-blue-600 bg-blue-50' },
        { label: 'Converted', value: convertedTotal, icon: GraduationCap, tone: 'text-emerald-600 bg-emerald-50' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-ame-orange" /> Counsellor Performance
        </h2>
        <p className="text-xs text-slate-500 mt-1">How each counsellor is progressing on the leads assigned to them.</p>
      </div>

      {/* Date range */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Leads assigned</label>
        <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="input-field py-2 sm:max-w-[180px]" />
        <span className="text-xs font-semibold text-slate-500">to</span>
        <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="input-field py-2 sm:max-w-[180px]" />
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-[11px] font-bold text-slate-500 hover:text-blue-600">
            All time
          </button>
        )}
      </div>

      {loading && !report ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {tiles.map((tile) => (
              <div key={tile.label} className="glass-card px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tile.tone}`}>
                  <tile.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900 leading-none">{tile.value}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{tile.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Per telecaller */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm border-collapse">
                <thead className="brand-header">
                  <tr className="font-semibold uppercase text-[11px] tracking-wide">
                    <th className="p-4 whitespace-nowrap">Counsellor</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Assigned</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Active</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Not Started</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Worked</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Reassigned</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-px">Converted</th>
                    <th className="p-4 whitespace-nowrap">Current Statuses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {telecallers.length > 0 ? (
                    telecallers.map((t) => (
                      <tr key={t.user._id} className="hover:bg-slate-50/50">
                        <td className="p-4 whitespace-nowrap">
                          <Link
                            to={`/dashboard/meta-leads/report/${t.user._id}`}
                            className="font-medium text-slate-900 hover:text-blue-700 leading-tight capitalize"
                          >
                            {t.user.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 mt-0.5">{t.user.email}</p>
                          <span className={`text-[10px] uppercase tracking-wide font-semibold ${t.user.status === 'inactive' ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {t.user.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center whitespace-nowrap font-bold text-slate-900">{t.totalAssigned}</td>
                        <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">{t.activeLeads}</td>
                        <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">{t.notStarted}</td>
                        <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">{t.workedLeads}</td>
                        <td className="px-3 py-4 text-center whitespace-nowrap font-semibold">{t.reassignedAway}</td>
                        <td className="px-3 py-4 text-center whitespace-nowrap">
                          <p className="font-mono font-semibold text-emerald-600">{t.converted}</p>
                          <p className="text-[11px] font-mono font-semibold text-slate-700">{t.conversionRate}%</p>
                        </td>
                        <td className="p-4">
                          {t.statuses.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {t.statuses.map((s) => (
                                <span key={s.statusId} className={`px-2 py-0.5 rounded text-[11px] uppercase font-bold ${statusBadgeClass(s.color)}`}>
                                  {s.name}: {s.count}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">No counsellors found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="p-4 border-t border-slate-100 text-[11px] text-slate-500 font-semibold leading-relaxed">
              Assigned counts every lead a counsellor has been given, including leads later reassigned to someone else.
              Converted counts leads whose current status is marked as a conversion ({convertedTotal} of {assignedTotal} overall).
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MetaLeadReportPage;
