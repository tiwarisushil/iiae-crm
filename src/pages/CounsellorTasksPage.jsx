import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import { ClipboardList, Search, Eye, X, ChevronLeft, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { statusBadgeClass, formatFieldLabel, formatFieldValue, isHiddenLeadField } from '../utils/metaLeadStatus';
import PriorityToggle, { PRIORITY_FILTER_OPTIONS } from '../components/PriorityToggle';

const PAGE_SIZES = [20, 50, 100];

const leadPaths = (lead) => {
  if (lead.source === 'WEBSITE') return { status: `/leads/website/${lead._id}/status`, priority: `/leads/website/${lead._id}/priority`, assign: '/leads/website/assign', tracks: `/leads/website/${lead._id}/assignments` };
  if (lead.source === 'MANUAL') return { status: `/leads/manual/${lead._id}/status`, priority: `/leads/manual/${lead._id}/priority`, assign: '/leads/manual/assign', tracks: `/leads/manual/${lead._id}/assignments` };
  return { status: `/integrations/meta/leads/${lead._id}/status`, priority: `/integrations/meta/leads/${lead._id}/priority`, assign: '/integrations/meta/leads/assign', tracks: `/integrations/meta/leads/${lead._id}/assignments` };
};

// One counsellor's leads, laid out the same way as the leads list.
const CounsellorTasksPage = () => {
  const { counsellorId } = useParams();
  const [counsellor, setCounsellor] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [telecallers, setTelecallers] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priority, setPriority] = useState('');
  const [priorityBusy, setPriorityBusy] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [selectedLead, setSelectedLead] = useState(null);
  const [leadTracks, setLeadTracks] = useState(null);
  const [modalAssigneeId, setModalAssigneeId] = useState('');
  const [modalAssigning, setModalAssigning] = useState(false);
  const [statusForm, setStatusForm] = useState({ statusId: '', remark: '' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [revision, setRevision] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    api.get('/users?role=counsellor').then((response) => setTelecallers(response.data || [])).catch(() => {});
    api.get('/integrations/meta/lead-statuses').then((response) => setStatuses(response.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const load = async () => {
      const requestId = ++latestRequest.current;
      setLoading(true);
      setMissing(false);
      try {
        const params = { page, limit: pageSize };
        if (search) params.search = search;
        if (source) params.source = source;
        if (statusId) params.statusId = statusId;
        if (priority) params.priority = priority;
        if (fromDate) params.from = new Date(`${fromDate}T00:00:00`).toISOString();
        if (toDate) params.to = new Date(`${toDate}T23:59:59.999`).toISOString();

        const response = await api.get(`/integrations/meta/reports/telecallers/${counsellorId}`, { params });
        if (requestId !== latestRequest.current) return;
        setCounsellor(response.data.counsellor);
        setTasks(response.data.tasks);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } catch (error) {
        if (requestId !== latestRequest.current) return;
        if (error.response?.status === 404) {
          setMissing(true);
          setCounsellor(null);
          setTasks([]);
        } else {
          toast.error('Failed to load leads');
        }
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    };
    load();
  }, [counsellorId, search, source, statusId, priority, fromDate, toDate, page, pageSize, revision]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSource('');
    setStatusId('');
    setPriority('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const fetchLeadTracks = async (lead) => {
    try {
      const response = await api.get(leadPaths(lead).tracks);
      setLeadTracks(response.data);
    } catch (error) {
      setLeadTracks([]);
    }
  };

  const handleViewLead = (task) => {
    const lead = task.lead || {};
    const selected = {
      _id: lead._id,
      fullName: lead.fullName,
      fields: lead.fields || {},
      source: lead.source,
      sourceLabel: lead.sourceLabel,
      createdAt: lead.leadCreatedAt || lead.createdAt,
      currentStatus: task.currentStatus,
      isPriority: Boolean(lead.isPriority),
      assignedTo: counsellor ? { _id: counsellor._id, name: counsellor.name, email: counsellor.email } : null,
    };
    setSelectedLead(selected);
    setLeadTracks(null);
    setModalAssigneeId('');
    setStatusForm({ statusId: task.currentStatus?._id || '', remark: '' });
    fetchLeadTracks(selected);
  };

  const togglePriority = async (lead) => {
    const next = !lead.isPriority;
    const apply = (value) => {
      setTasks((current) => current.map((task) => (task.lead && task.lead._id === lead._id
        ? { ...task, lead: { ...task.lead, isPriority: value } }
        : task)));
      setSelectedLead((current) => (current && current._id === lead._id ? { ...current, isPriority: value } : current));
    };
    setPriorityBusy(lead._id);
    apply(next);
    try {
      await api.put(leadPaths(lead).priority, { isPriority: next });
      toast.success(next ? 'Marked as priority' : 'Priority removed');
      // The lead may no longer match the priority filter
      if (priority) setRevision((current) => current + 1);
    } catch (error) {
      apply(!next);
      toast.error(error.response?.data?.message || 'Failed to update priority');
    } finally {
      setPriorityBusy('');
    }
  };

  const handleStatusSave = async () => {
    if (!statusForm.statusId) {
      toast.error('Select a status');
      return;
    }
    setSavingStatus(true);
    try {
      const response = await api.put(leadPaths(selectedLead).status, statusForm);
      toast.success('Status updated');
      setSelectedLead({ ...selectedLead, currentStatus: response.data.currentStatus });
      setStatusForm({ statusId: response.data.currentStatus?._id || '', remark: '' });
      fetchLeadTracks(selectedLead);
      setRevision((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAssignFromModal = async () => {
    setModalAssigning(true);
    try {
      const unassign = modalAssigneeId === 'unassign';
      const response = await api.post(leadPaths(selectedLead).assign, {
        leadIds: [selectedLead._id],
        telecallerId: unassign ? null : modalAssigneeId,
      });
      toast.success(response.data.message);
      const newOwner = unassign ? null : telecallers.find((tc) => tc._id === modalAssigneeId);
      setSelectedLead({
        ...selectedLead,
        assignedTo: newOwner ? { _id: newOwner._id, name: newOwner.name, email: newOwner.email } : null,
      });
      setModalAssigneeId('');
      fetchLeadTracks(selectedLead);
      setRevision((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign lead');
    } finally {
      setModalAssigning(false);
    }
  };

  const hasFilters = searchInput || source || statusId || priority || fromDate || toDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-ame-orange" /> {counsellor ? counsellor.name : 'Counsellor'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Leads assigned to this counsellor.
          </p>
        </div>
        <Link to="/dashboard/counsellors" className="btn-outline rounded-md text-base flex items-center gap-1.5">
          <ChevronLeft className="w-4.5 h-4.5" /> Performance
        </Link>
      </div>

      {missing ? (
        <div className="p-8 text-center text-slate-500 font-semibold">Counsellor not found</div>
      ) : (
        <>
          <div className="border-b border-slate-300 overflow-hidden">
            <div className="flex items-center">
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by name, phone or email..."
                  className="w-full bg-transparent border-0 rounded-none pl-10 pr-3 py-2.5 text-base text-slate-900 placeholder:text-slate-900 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className={`shrink-0 self-stretch inline-flex items-center gap-1.5 px-4 border-l border-slate-300 text-base font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer ${filtersOpen ? 'bg-slate-50' : 'bg-white'}`}
              >
                Filter
                {(source || statusId || priority || fromDate || toDate) && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {[source, statusId, priority, fromDate, toDate].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden" inert={!filtersOpen}>
                <div className={`border-t border-amber-200 bg-amber-50/80 p-4 space-y-4 transition-opacity duration-300 ${filtersOpen ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Source</span>
                      <select value={source} onChange={updateFilter(setSource)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                        <option value="">All sources</option>
                        <option value="meta">Meta</option>
                        <option value="upload">Uploaded</option>
                        <option value="form">Added by form</option>
                        <option value="website">Website</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Status</span>
                      <select value={statusId} onChange={updateFilter(setStatusId)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                        <option value="">All Statuses</option>
                        <option value="none">Not started</option>
                        {statuses.map((status) => (
                          <option key={status._id} value={status._id}>{status.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Priority</span>
                      <select value={priority} onChange={updateFilter(setPriority)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                        {PRIORITY_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Received</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input type="date" aria-label="Received from" value={fromDate} max={toDate || undefined} onChange={updateFilter(setFromDate)} className="input-field rounded-md bg-white text-base text-slate-900 py-2 sm:max-w-[180px]" />
                      <span className="text-sm font-semibold text-slate-900">to</span>
                      <input type="date" aria-label="Received to" value={toDate} min={fromDate || undefined} onChange={updateFilter(setToDate)} className="input-field rounded-md bg-white text-base text-slate-900 py-2 sm:max-w-[180px]" />
                      {hasFilters && (
                        <button onClick={clearFilters} className="text-sm font-bold text-blue-700 hover:text-blue-800 shrink-0 sm:ml-auto">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm border-collapse">
                  <thead className="brand-header">
                    <tr className="font-semibold uppercase text-[11px] tracking-wide">
                      <th className="p-4 whitespace-nowrap">Lead</th>
                      <th className="p-4 whitespace-nowrap">Source</th>
                      <th className="p-4 whitespace-nowrap">Assigned Counsellor</th>
                      <th className="p-4 whitespace-nowrap">Status</th>
                      <th className="p-4 whitespace-nowrap">Received</th>
                      <th className="p-4 text-center whitespace-nowrap">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tasks.length > 0 ? tasks.map((task) => {
                      const lead = task.lead || {};
                      const contact = [lead.phone, lead.email].filter(Boolean).join(' | ');
                      const received = lead.leadCreatedAt || lead.createdAt;
                      return (
                        <tr key={task._id} className={lead.isPriority ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/50'}>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <PriorityToggle active={lead.isPriority} disabled={priorityBusy === lead._id} onToggle={() => togglePriority(lead)} />
                              <div>
                                <p className="font-bold text-slate-900 leading-tight capitalize">{lead.fullName || 'Lead'}</p>
                                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{contact || 'No contact details'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-700">{lead.sourceLabel || 'Meta'}</span>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-900 capitalize">{counsellor?.name || 'Unallocated'}</p>
                          </td>
                          <td className="p-4">
                            {task.currentStatus ? (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] uppercase font-semibold tracking-wide ${statusBadgeClass(task.currentStatus.color)}`}>
                                {task.currentStatus.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">Not started</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 whitespace-nowrap">
                              {received ? new Date(received).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center">
                              <button onClick={() => handleViewLead(task)} className="btn-outline !h-8 !px-2.5 text-xs">
                                <Eye className="w-4 h-4" /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">
                          {hasFilters ? 'No leads match these filters' : 'No leads yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500 font-semibold">
                  {total} lead(s) | Page {page} of {totalPages}
                </p>
                <select
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
                  className="input-field !h-8 !w-auto text-xs"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading} className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages || loading} className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-4xl max-h-[88vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex min-w-0 items-center gap-3">
                <h3 className="truncate text-sm font-bold text-slate-900">{selectedLead.fullName || 'Lead'}</h3>
                <PriorityToggle withLabel active={selectedLead.isPriority} disabled={priorityBusy === selectedLead._id} onToggle={() => togglePriority(selectedLead)} />
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Object.entries(selectedLead.fields || {}).filter(([key]) => !isHiddenLeadField(key)).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{formatFieldLabel(key)}</p>
                        <p className="text-sm text-slate-900 break-words">{formatFieldValue(value) || '-'}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Source: {selectedLead.sourceLabel || 'Meta'} | Received {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleString() : '—'}
                  </p>
                  <div className="p-3 bg-amber-50">
                    <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
                      {selectedLead.assignedTo ? `Reassign (currently with ${selectedLead.assignedTo.name})` : 'Assign to'}
                    </label>
                    <div className="flex items-center gap-2">
                      <select value={modalAssigneeId} onChange={(event) => setModalAssigneeId(event.target.value)} className="input-field py-2 bg-white flex-1 min-w-0">
                        <option value="">Select counsellor...</option>
                        {telecallers.filter((tc) => tc.status === 'active' && tc._id !== selectedLead.assignedTo?._id).map((tc) => (
                          <option key={tc._id} value={tc._id}>{tc.name}</option>
                        ))}
                        {selectedLead.assignedTo && <option value="unassign">Remove assignment</option>}
                      </select>
                      <button onClick={handleAssignFromModal} disabled={modalAssigning || !modalAssigneeId} className="btn-primary px-4 py-2 shrink-0 disabled:opacity-60">
                        {modalAssigning ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 space-y-3">
                    <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wide">Lead status</label>
                    <select value={statusForm.statusId} onChange={(event) => setStatusForm({ ...statusForm, statusId: event.target.value })} className="input-field py-2 bg-white">
                      <option value="">Select status</option>
                      {statuses.map((status) => (
                        <option key={status._id} value={status._id}>{status.name}</option>
                      ))}
                    </select>
                    <textarea value={statusForm.remark} onChange={(event) => setStatusForm({ ...statusForm, remark: event.target.value })} placeholder="Remark" rows="2" maxLength={1000} className="input-field py-2 bg-white resize-none" />
                    <button type="button" onClick={handleStatusSave} disabled={savingStatus || !statusForm.statusId} className="btn-primary px-4 py-2 disabled:opacity-60">
                      {savingStatus ? 'Saving...' : 'Update status'}
                    </button>
                  </div>
                </div>
                <div className="space-y-3 md:border-l md:border-slate-100 md:pl-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Counsellor activity</p>
                  {leadTracks === null ? (
                    <p className="text-sm text-slate-500">Loading...</p>
                  ) : leadTracks.length === 0 ? (
                    <p className="text-sm text-slate-500">This lead has not been assigned yet.</p>
                  ) : leadTracks.map((track) => (
                    <div key={track._id} className="py-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{track.telecaller?.name || 'Removed user'}</p>
                        {track.isActive ? (
                          <span className="text-[11px] font-semibold uppercase text-emerald-700">Current owner</span>
                        ) : (
                          <span className="text-[11px] font-semibold uppercase text-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" /> Reassigned</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Assigned {track.assignedAt ? new Date(track.assignedAt).toLocaleString() : '—'}
                        {track.endedAt ? ` · until ${new Date(track.endedAt).toLocaleString()}` : ''}
                      </p>
                      {track.history.length > 0 ? (
                        <div className="divide-y divide-slate-200 border-t border-slate-200">
                          {track.history.map((entry, index) => (
                            <div key={index} className="flex items-start gap-2 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-semibold shrink-0 ${statusBadgeClass(entry.statusColor)}`}>{entry.statusName}</span>
                              <div className="min-w-0">
                                <p className="text-sm text-slate-900 break-words">{entry.remark || 'No remark'}</p>
                                {entry.changedAt && (
                                  <p className="text-xs text-slate-500">{new Date(entry.changedAt).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Not started</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounsellorTasksPage;
