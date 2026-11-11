import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Headset, Search, X, ChevronLeft, ChevronRight, Lock, MessageSquarePlus, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { statusBadgeClass, formatFieldLabel, formatFieldValue, isHiddenLeadField } from '../utils/metaLeadStatus';
import PriorityToggle, { PRIORITY_FILTER_OPTIONS } from '../components/PriorityToggle';

const PAGE_SIZE = 20;

// Telecaller's own Meta leads. "Active" leads can be worked; "Previous" leads were
// reassigned to someone else and stay visible exactly as the telecaller left them.
const MyMetaLeadsPage = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, previous: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [courses, setCourses] = useState([]);

  const [tab, setTab] = useState('active'); // active | previous
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Lead modal
  const [selected, setSelected] = useState(null);
  const [logData, setLogData] = useState({ statusId: '', remark: '', registrationBy: '', courseId: '' });
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [priorityBusy, setPriorityBusy] = useState('');
  const latestRequest = useRef(0);

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Debounce typing in the search box
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchLeads();
  }, [tab, search, statusFilter, priorityFilter, page]);

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/integrations/meta/lead-statuses');
      setStatuses(response.data);
    } catch (e) {}
    try {
      const response = await api.get('/courses');
      setCourses(response.data || []);
    } catch (e) {}
  };

  const fetchLeads = async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const params = { state: tab, page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.statusId = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await api.get('/integrations/meta/my-leads', { params });
      if (requestId !== latestRequest.current) return;

      setAssignments(response.data.assignments);
      setCounts(response.data.counts);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      if (requestId === latestRequest.current) {
        toast.error('Failed to load your leads');
      }
    } finally {
      if (requestId === latestRequest.current) {
        setLoading(false);
      }
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setStatusFilter('');
    setPage(1);
  };

  // The flag is stored on the lead; the request goes through the assignment the counsellor owns
  const togglePriority = async (assignment) => {
    const next = !assignment.lead?.isPriority;
    const apply = (value) => {
      const update = (item) => (item._id === assignment._id ? { ...item, lead: { ...item.lead, isPriority: value } } : item);
      setAssignments((current) => current.map(update));
      setSelected((current) => (current ? update(current) : current));
    };
    setPriorityBusy(assignment._id);
    apply(next);
    try {
      await api.put(`/integrations/meta/my-leads/${assignment._id}/priority`, { isPriority: next });
      toast.success(next ? 'Marked as priority' : 'Priority removed');
      // The lead may no longer match the priority filter
      if (priorityFilter) fetchLeads();
    } catch (error) {
      apply(!next);
      toast.error(error.response?.data?.message || 'Failed to update priority');
      // The lead was reassigned in the meantime
      if (error.response?.status === 403) fetchLeads();
    } finally {
      setPriorityBusy('');
    }
  };

  const openLead = (assignment) => {
    setSelected(assignment);
    setLogData({
      statusId: assignment.currentStatus?._id || '',
      remark: '',
      registrationBy: assignment.lead?.crmLead?.registrationBy || '',
      courseId: '',
    });
  };

  const openRegistration = (path, registrationBy) => {
    if (registrationBy === 'counsellor') {
      navigate(path);
      return;
    }
    setShareLink(`${window.location.origin}${path}`);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    const chosen = statuses.find((status) => status._id === logData.statusId);
    const formAlreadySubmitted = Boolean(selected?.lead?.crmLead?.formSubmitted);
    if (chosen?.isConversion && !formAlreadySubmitted && !logData.registrationBy) {
      toast.error('Choose who will fill the registration form');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put(`/integrations/meta/my-leads/${selected._id}/status`, logData);
      setSelected(response.data);
      setLogData({
        statusId: response.data.currentStatus?._id || '',
        remark: '',
        registrationBy: response.data.registrationBy || response.data.lead?.crmLead?.registrationBy || '',
        courseId: '',
      });
      fetchLeads();
      const path = response.data.registrationPath || response.data.lead?.crmLead?.registrationPath;
      const registrationBy = response.data.registrationBy || response.data.lead?.crmLead?.registrationBy;
      const submitted = response.data.formSubmitted || response.data.lead?.crmLead?.formSubmitted;
      if (chosen?.isConversion && path && !submitted) {
        toast.success('The lead stays on its current status until the form is submitted');
        setSelected(null);
        openRegistration(path, registrationBy);
      } else {
        toast.success('Status updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
      // The lead was reassigned while this window was open
      if (error.response?.status === 403) {
        setSelected(null);
        fetchLeads();
      }
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = searchInput || statusFilter || priorityFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Headset className="w-5 h-5 text-ame-orange" /> My Leads
        </h2>
        <p className="text-xs text-slate-500 mt-1">Leads assigned to you from Meta, uploads, added forms, and the website. Update the status after every call.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            tab === 'active' ? 'bg-ame-orange text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Active ({counts.active})
        </button>
        <button
          onClick={() => switchTab('previous')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            tab === 'previous' ? 'bg-ame-orange text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Previous ({counts.previous})
        </button>
      </div>

      {tab === 'previous' && (
        <div className="flex items-start gap-2 p-3 bg-slate-100 text-xs text-slate-600 font-semibold">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>These leads were reassigned. You can still see the progress you made, but they can no longer be changed.</span>
        </div>
      )}

      {/* Filter and search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-ame-orange" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, email or any answer..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-2"
          >
            <option value="">All Statuses</option>
            <option value="none">Not started</option>
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter priority"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="input-field py-2"
          >
            {PRIORITY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-ame-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="brand-header">
                <tr className="font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Lead</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Last Remark</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">{tab === 'active' ? 'Assigned' : 'Reassigned'}</th>
                  <th className="p-4 text-center">{tab === 'active' ? 'Update' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignments.length > 0 ? (
                  assignments.map((a) => {
                    const lead = a.lead;
                    const contact = [lead.phone, lead.email].filter(Boolean).join(' | ');
                    const lastEntry = a.history[a.history.length - 1];
                    return (
                      <tr key={a._id} className={lead.isPriority ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/50'}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {a.isActive ? (
                              <PriorityToggle active={lead.isPriority} disabled={priorityBusy === a._id} onToggle={() => togglePriority(a)} />
                            ) : (
                              <PriorityToggle readOnly active={lead.isPriority} />
                            )}
                            <div>
                              <p className="font-bold text-slate-900 leading-tight capitalize">{lead.fullName || 'Meta Lead'}</p>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                {contact || `${Object.keys(lead.fields || {}).length} answer(s)`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700">{lead.sourceLabel || 'Meta'}</span>
                        </td>
                        <td className="p-4 max-w-xs">
                          {lastEntry ? (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-700 truncate font-medium">{lastEntry.remark ? `"${lastEntry.remark}"` : 'No remark'}</p>
                              <p className="text-[11px] text-slate-500 font-bold uppercase">{new Date(lastEntry.changedAt).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold text-[11px]">No follow-up logged</span>
                          )}
                        </td>
                        <td className="p-4">
                          {a.currentStatus ? (
                            <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase font-bold ${statusBadgeClass(a.currentStatus.color)}`}>
                              {a.currentStatus.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold text-[11px]">Not started</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700">
                            {new Date(tab === 'active' ? a.assignedAt : a.endedAt || a.assignedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            {a.isActive ? (
                              <button
                                onClick={() => openLead(a)}
                                className="px-2 py-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" /> Update
                              </button>
                            ) : (
                              <button
                                onClick={() => openLead(a)}
                                className="px-2 py-1 bg-slate-900/10 text-slate-800 hover:bg-slate-900/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">
                      {hasFilters
                        ? 'No leads match these filters'
                        : tab === 'active'
                          ? 'No leads are assigned to you right now'
                          : 'None of your leads have been reassigned'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 font-semibold">
            {total} lead(s) | Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-2 py-1 bg-slate-900/10 text-slate-800 hover:bg-slate-900/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-2 py-1 bg-slate-900/10 text-slate-800 hover:bg-slate-900/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {shareLink && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Share this registration form</h3>
            <p className="text-xs text-slate-500">The student opens this link and fills the form. Until the fee is marked paid, they appear under Unpaid Registrations.</p>
            <input readOnly value={shareLink} className="input-field text-xs" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShareLink('')} className="btn-outline px-4 py-2">Close</button>
              <button
                type="button"
                className="btn-primary px-4 py-2"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast.success('Link copied');
                }}
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD MODAL: details, own status timeline, status update */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex min-w-0 items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <Headset className="w-5 h-5 text-blue-600 shrink-0" /> <span className="truncate">{selected.lead.fullName || 'Meta Lead'}</span>
                </h3>
                {selected.isActive ? (
                  <PriorityToggle withLabel active={selected.lead.isPriority} disabled={priorityBusy === selected._id} onToggle={() => togglePriority(selected)} />
                ) : (
                  <PriorityToggle withLabel readOnly active={selected.lead.isPriority} />
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {!selected.isActive && (
                <div className="flex items-start gap-2 p-3 mb-5 bg-slate-100 text-xs text-slate-600 font-semibold">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This lead was reassigned{selected.endedAt ? ` on ${new Date(selected.endedAt).toLocaleDateString()}` : ''}. View only.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: lead answers and the status update */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Object.entries(selected.lead.fields || {}).filter(([key]) => !isHiddenLeadField(key)).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{formatFieldLabel(key)}</p>
                        <p className="text-xs font-semibold text-slate-800 break-words">{formatFieldValue(value) || '-'}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Source: {selected.lead.sourceLabel || 'Meta'}
                    {selected.lead.source === 'META' && selected.lead.formName ? ` | Form: ${selected.lead.formName}` : ''}
                    {' | '}Received {new Date(selected.lead.leadCreatedAt || selected.lead.createdAt).toLocaleString()}
                  </p>

                  {/* Status update (only while the lead is still mine) */}
                  {selected.isActive && (
                    <form onSubmit={handleStatusSubmit} className="pt-4 border-t border-slate-100 space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Lead Status</label>
                        <select
                          required
                          value={logData.statusId}
                          onChange={(e) => setLogData({ ...logData, statusId: e.target.value })}
                          className="input-field"
                        >
                          <option value="">Select status</option>
                          {statuses.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                        {statuses.length === 0 && (
                          <p className="text-[11px] text-amber-700 font-semibold mt-1">No statuses have been set up yet. Please ask your admin to add them.</p>
                        )}
                      </div>

                      {statuses.find((status) => status._id === logData.statusId)?.isConversion && !selected.lead?.crmLead?.formSubmitted && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Who fills the registration form?</label>
                            <div className="space-y-2">
                              <label className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                                <input
                                  type="radio"
                                  name="registrationBy"
                                  checked={logData.registrationBy === 'student'}
                                  onChange={() => setLogData({ ...logData, registrationBy: 'student' })}
                                  className="mt-0.5"
                                />
                                <span>By student — create a link you can share. The student fills the form.</span>
                              </label>
                              <label className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                                <input
                                  type="radio"
                                  name="registrationBy"
                                  checked={logData.registrationBy === 'counsellor'}
                                  onChange={() => setLogData({ ...logData, registrationBy: 'counsellor' })}
                                  className="mt-0.5"
                                />
                                <span>By counsellor — you fill the same form for this student.</span>
                              </label>
                            </div>
                          </div>
                          {courses.length > 0 && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course</label>
                              <select
                                value={logData.courseId}
                                onChange={(e) => setLogData({ ...logData, courseId: e.target.value })}
                                className="input-field"
                              >
                                <option value="">Select course</option>
                                {courses.map((course) => (
                                  <option key={course._id} value={course._id}>{course.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Call Details / Remarks</label>
                        <textarea
                          value={logData.remark}
                          onChange={(e) => setLogData({ ...logData, remark: e.target.value })}
                          placeholder="Record summary of the conversation..."
                          rows="3"
                          maxLength={1000}
                          className="input-field resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                        >
                          Close
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 disabled:opacity-60">
                          {saving
                            ? 'Saving...'
                            : logData.registrationBy === 'counsellor' && statuses.find((status) => status._id === logData.statusId)?.isConversion
                              ? 'Open form'
                              : logData.registrationBy === 'student' && statuses.find((status) => status._id === logData.statusId)?.isConversion
                                ? 'Create link'
                                : 'Update Status'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Right: my status timeline (scrolls on its own when it gets long) */}
                <div className="md:border-l md:border-slate-100 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">My progress</p>
                  {selected.history.length > 0 ? (
                    <div className="space-y-2.5 md:max-h-[56vh] md:overflow-y-auto custom-scrollbar md:pr-1">
                      {selected.history.map((entry, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-bold shrink-0 ${statusBadgeClass(entry.statusColor)}`}>
                            {entry.statusName}
                          </span>
                          <div className="min-w-0">
                            {entry.remark && <p className="text-[11px] text-slate-700 font-medium break-words">"{entry.remark}"</p>}
                            <p className="text-[11px] text-slate-500 font-bold uppercase">{new Date(entry.changedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-semibold">Not started yet</p>
                  )}
                </div>
              </div>
            </div>

            {!selected.isActive && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button onClick={() => setSelected(null)} className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMetaLeadsPage;
