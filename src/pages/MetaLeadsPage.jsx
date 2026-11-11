import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Megaphone, Search, Eye, X, ChevronLeft, ChevronRight, ChevronDown, Plug, UserPlus, ListChecks, Lock, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MetaLeadStatusManager from '../components/MetaLeadStatusManager';
import MetaLeadAssignModal from '../components/MetaLeadAssignModal';
import ExportAllLeadsButton from '../components/ExportAllLeadsButton';
import DeleteRecordButton from '../components/DeleteRecordButton';
import PriorityToggle, { PRIORITY_FILTER_OPTIONS } from '../components/PriorityToggle';
import { statusBadgeClass, formatFieldLabel, formatFieldValue, isHiddenLeadField } from '../utils/metaLeadStatus';

const PAGE_SIZES = [20, 50, 100];

const MetaLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({ pages: [], forms: [] });
  const [telecallers, setTelecallers] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Filters (applied on the server)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageId, setPageId] = useState('');
  const [formId, setFormId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priority, setPriority] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState(null);
  const [leadTracks, setLeadTracks] = useState(null);
  const [modalAssigneeId, setModalAssigneeId] = useState('');
  const [modalAssigning, setModalAssigning] = useState(false);
  const [statusForm, setStatusForm] = useState({ statusId: '', remark: '' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [priorityBusy, setPriorityBusy] = useState('');
  const actionsRef = useRef(null);
  const latestRequest = useRef(0);

  useEffect(() => {
    fetchFilterOptions();
    fetchTelecallers();
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (!actionsOpen) return undefined;
    const close = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [actionsOpen]);

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
  }, [search, pageId, formId, assignedTo, statusId, priority, fromDate, toDate, page, pageSize]);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/integrations/meta/leads/filters');
      setFilterOptions(response.data);
    } catch (e) {}
  };

  const fetchTelecallers = async () => {
    try {
      const response = await api.get('/users?role=counsellor');
      setTelecallers(response.data);
    } catch (e) {}
  };

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/integrations/meta/lead-statuses');
      setStatuses(response.data);
    } catch (e) {}
  };

  const fetchLeads = async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      if (pageId) params.pageId = pageId;
      if (formId) params.formId = formId;
      if (assignedTo) params.assignedTo = assignedTo;
      if (statusId) params.statusId = statusId;
      if (priority) params.priority = priority;
      // Whole days in the user's own timezone
      if (fromDate) params.from = new Date(`${fromDate}T00:00:00`).toISOString();
      if (toDate) params.to = new Date(`${toDate}T23:59:59.999`).toISOString();

      const response = await api.get('/integrations/meta/leads', { params });
      if (requestId !== latestRequest.current) return; // a newer request is on its way

      setLeads(response.data.leads);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      if (requestId === latestRequest.current) {
        toast.error('Failed to load Meta leads');
      }
    } finally {
      if (requestId === latestRequest.current) {
        setLoading(false);
      }
    }
  };

  const updateFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handlePageFilter = (e) => {
    setPageId(e.target.value);
    setFormId('');
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setPageId('');
    setFormId('');
    setAssignedTo('');
    setStatusId('');
    setPriority('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleAssigned = () => {
    setIsAssignOpen(false);
    fetchLeads();
  };

  const fetchLeadTracks = async (leadId) => {
    try {
      const response = await api.get(`/integrations/meta/leads/${leadId}/assignments`);
      setLeadTracks(response.data);
      const active = response.data.find((track) => track.isActive);
      setStatusForm((current) => ({
        statusId: active?.currentStatus?._id || current.statusId,
        remark: current.remark,
      }));
    } catch (error) {
      setLeadTracks([]);
    }
  };

  const togglePriority = async (lead) => {
    const next = !lead.isPriority;
    const apply = (value) => {
      setLeads((current) => current.map((item) => (item._id === lead._id ? { ...item, isPriority: value } : item)));
      setSelectedLead((current) => (current && current._id === lead._id ? { ...current, isPriority: value } : current));
    };
    setPriorityBusy(lead._id);
    apply(next);
    try {
      await api.put(`/integrations/meta/leads/${lead._id}/priority`, { isPriority: next });
      toast.success(next ? 'Marked as priority' : 'Priority removed');
      // The lead may no longer match the priority filter
      if (priority) fetchLeads();
    } catch (error) {
      apply(!next);
      toast.error(error.response?.data?.message || 'Failed to update priority');
    } finally {
      setPriorityBusy('');
    }
  };

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setLeadTracks(null);
    setModalAssigneeId('');
    setStatusForm({ statusId: lead.currentStatus?._id || '', remark: '' });
    fetchLeadTracks(lead._id);
  };

  const handleStatusSave = async () => {
    if (!statusForm.statusId) {
      toast.error('Select a status');
      return;
    }
    setSavingStatus(true);
    try {
      const response = await api.put(`/integrations/meta/leads/${selectedLead._id}/status`, statusForm);
      toast.success('Status updated');
      setSelectedLead({
        ...selectedLead,
        currentStatus: response.data.currentStatus,
        adminStatusHistory: response.data.storedOn === 'lead' ? response.data.history : selectedLead.adminStatusHistory,
      });
      setStatusForm({ statusId: response.data.currentStatus?._id || '', remark: '' });
      fetchLeadTracks(selectedLead._id);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  // Assign or reassign the lead that is open in the details window
  const handleAssignFromModal = async () => {
    setModalAssigning(true);
    try {
      const unassign = modalAssigneeId === 'unassign';
      const response = await api.post('/integrations/meta/leads/assign', {
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
      fetchLeadTracks(selectedLead._id);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign lead');
    } finally {
      setModalAssigning(false);
    }
  };

  const handleCloseStatusManager = () => {
    setIsStatusManagerOpen(false);
    fetchStatuses();
    fetchLeads();
  };

  const formOptions = pageId ? filterOptions.forms.filter((f) => f.pageId === pageId) : filterOptions.forms;
  const hasFilters = searchInput || pageId || formId || assignedTo || statusId || priority || fromDate || toDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber-600" /> Meta Leads
          </h2>
          <p className="text-sm text-slate-900 mt-1">Leads collected from Facebook Lead Ads. Assign them to counsellors and track their progress.</p>
        </div>
        <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
          <button onClick={() => setIsAssignOpen(true)} className="btn-primary rounded-md text-base flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" /> Assign Leads
          </button>
          <button onClick={() => setIsStatusManagerOpen(true)} className="btn-outline rounded-md text-base flex items-center gap-1.5">
            <ListChecks className="w-4 h-4" /> Statuses
          </button>
          <ExportAllLeadsButton className="rounded-md text-base" />
          <Link to="/dashboard/integrations/meta" className="btn-outline rounded-md text-base flex items-center gap-1.5">
            <Plug className="w-4 h-4" /> Meta Connection
          </Link>
        </div>
        <div className="relative shrink-0 md:hidden" ref={actionsRef}>
          <button
            type="button"
            aria-label="Lead actions"
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((open) => !open)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setIsAssignOpen(true); setActionsOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <UserPlus className="w-4 h-4" /> Assign Leads
              </button>
              <button
                type="button"
                onClick={() => { setIsStatusManagerOpen(true); setActionsOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <ListChecks className="w-4 h-4" /> Statuses
              </button>
              <ExportAllLeadsButton plain onOpen={() => setActionsOpen(false)} />
              <Link
                to="/dashboard/integrations/meta"
                onClick={() => setActionsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Plug className="w-4 h-4" /> Meta Connection
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-slate-300 overflow-hidden">
        <div className="flex items-center">
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-ame-orange" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, phone, email or any answer..."
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
            {(pageId || formId || assignedTo || statusId || priority || fromDate || toDate) && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold inline-flex items-center justify-center">
                {[pageId, formId, assignedTo, statusId, priority, fromDate, toDate].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden" inert={!filtersOpen}>
            <div className={`border-t border-amber-200 bg-amber-50/80 p-4 space-y-4 transition-opacity duration-300 ${filtersOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Page</span>
                  <select value={pageId} onChange={handlePageFilter} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                    <option value="">All Pages</option>
                    {filterOptions.pages.map((p) => (
                      <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Form</span>
                  <select value={formId} onChange={updateFilter(setFormId)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                    <option value="">All Forms</option>
                    {formOptions.map((f) => (
                      <option key={f.formId} value={f.formId}>{f.formName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Counsellor</span>
                  <select value={assignedTo} onChange={updateFilter(setAssignedTo)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                    <option value="">All Counsellors</option>
                    <option value="unassigned">Unassigned</option>
                    {telecallers.map((tc) => (
                      <option key={tc._id} value={tc._id}>{tc.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5">Status</span>
                  <select value={statusId} onChange={updateFilter(setStatusId)} className="input-field rounded-md bg-white text-base text-slate-900 py-2">
                    <option value="">All Statuses</option>
                    <option value="none">Not started</option>
                    {statuses.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
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
            <table className="w-full min-w-[920px] text-left text-sm border-collapse">
              <thead className="brand-header">
                <tr className="font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4 whitespace-nowrap">Lead</th>
                  <th className="p-4 whitespace-nowrap min-w-[240px]">Lead Form</th>
                  <th className="p-4 whitespace-nowrap">Assigned Counsellor</th>
                  <th className="p-4 whitespace-nowrap">Status</th>
                  <th className="p-4 whitespace-nowrap">Received</th>
                  <th className="p-4 text-center whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leads.length > 0 ? (
                  leads.map((l) => {
                    const contact = [l.phone, l.email].filter(Boolean).join(' | ');
                    return (
                      <tr key={l._id} className={l.isPriority ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/50'}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <PriorityToggle active={l.isPriority} disabled={priorityBusy === l._id} onToggle={() => togglePriority(l)} />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight capitalize">{l.fullName || 'Meta Lead'}</p>
                              <p className="text-xs text-slate-900 font-medium mt-0.5">
                                {contact || `${Object.keys(l.fields || {}).length} answer(s)`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 min-w-[240px]">
                          <p className="font-semibold text-slate-900 whitespace-nowrap">{l.formName || l.formId}</p>
                          <p className="text-xs text-slate-900 font-medium mt-0.5 whitespace-nowrap">{l.campaignName || l.pageName || l.pageId}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900 capitalize">{l.assignedTo?.name || 'Unallocated'}</p>
                        </td>
                        <td className="p-4">
                          {l.currentStatus ? (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] uppercase font-semibold tracking-wide ${statusBadgeClass(l.currentStatus.color)}`}>
                              {l.currentStatus.name}
                            </span>
                          ) : (
                            <span className="text-slate-900 font-semibold text-sm">{l.assignedTo ? 'Not started' : '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900">
                            {new Date(l.leadCreatedAt || l.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleViewLead(l)}
                              className="btn-outline !h-8 !px-2.5 text-xs"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">
                      {hasFilters ? 'No Meta leads match these filters' : 'No Meta leads received yet'}
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
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="input-field !h-8 !w-auto text-xs"
              title="Leads per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* LEAD DETAILS MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-5xl max-h-[88vh] overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex min-w-0 items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <Megaphone className="w-5 h-5 text-blue-600 shrink-0" /> <span className="truncate">{selectedLead.fullName || 'Meta Lead'}</span>
                </h3>
                <PriorityToggle withLabel active={selectedLead.isPriority} disabled={priorityBusy === selectedLead._id} onToggle={() => togglePriority(selectedLead)} />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <DeleteRecordButton
                  kind="meta"
                  id={selectedLead._id}
                  name={selectedLead.fullName}
                  email={selectedLead.email}
                  phone={selectedLead.phone}
                  onDeleted={() => { setSelectedLead(null); fetchLeads(); }}
                />
                <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-slate-600" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {Object.entries(selectedLead.fields || {})
                    .filter(([key]) => !isHiddenLeadField(key))
                    .map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-1">{formatFieldLabel(key)}</p>
                      <p className="text-sm text-slate-900 break-words">{formatFieldValue(value) || '-'}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50">
                  <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
                    {selectedLead.assignedTo ? `Reassign (currently with ${selectedLead.assignedTo.name})` : 'Assign to'}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={modalAssigneeId}
                      onChange={(e) => setModalAssigneeId(e.target.value)}
                      className="input-field py-2 bg-white flex-1 min-w-0"
                    >
                      <option value="">Select counsellor...</option>
                      {telecallers
                        .filter((tc) => tc.status === 'active' && tc._id !== selectedLead.assignedTo?._id)
                        .map((tc) => (
                          <option key={tc._id} value={tc._id}>{tc.name} ({tc.phone})</option>
                        ))}
                      {selectedLead.assignedTo && <option value="unassign">Remove assignment</option>}
                    </select>
                    <button
                      onClick={handleAssignFromModal}
                      disabled={modalAssigning || !modalAssigneeId}
                      className="btn-primary px-4 py-2 shrink-0 disabled:opacity-60"
                    >
                      <UserPlus className="w-4 h-4" /> {modalAssigning ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                </div>

                {leadTracks !== null && (
                  <div className="p-3 bg-emerald-50 space-y-3">
                    <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wide">Lead status</label>
                    <select
                      value={statusForm.statusId}
                      onChange={(e) => setStatusForm({ ...statusForm, statusId: e.target.value })}
                      className="input-field py-2 bg-white"
                    >
                      <option value="">Select status</option>
                      {statuses.map((status) => (
                        <option key={status._id} value={status._id}>{status.name}</option>
                      ))}
                    </select>
                    <textarea
                      value={statusForm.remark}
                      onChange={(e) => setStatusForm({ ...statusForm, remark: e.target.value })}
                      placeholder="Remark"
                      rows="2"
                      maxLength={1000}
                      className="input-field py-2 bg-white resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleStatusSave}
                      disabled={savingStatus || !statusForm.statusId}
                      className="btn-primary px-4 py-2 disabled:opacity-60"
                    >
                      {savingStatus ? 'Saving...' : 'Update status'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 md:border-l md:border-violet-100 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 border-violet-100">
                <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Counsellor activity</p>
                {leadTracks === null ? (
                  <p className="text-sm text-violet-800">Loading...</p>
                ) : leadTracks.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-violet-800">This lead has not been assigned yet.</p>
                    {(selectedLead.adminStatusHistory || []).length > 0 && (
                      <div className="divide-y divide-violet-200">
                        {(selectedLead.adminStatusHistory || []).map((entry, index) => (
                          <div key={index} className="flex items-start gap-2 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-semibold shrink-0 ${statusBadgeClass(entry.statusColor)}`}>
                              {entry.statusName}
                            </span>
                            <div className="min-w-0">
                              {entry.remark && <p className="text-sm text-slate-900 break-words">"{entry.remark}"</p>}
                              <p className="text-xs text-violet-700">{new Date(entry.changedAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  leadTracks.map((track) => (
                    <div key={track._id} className="py-3 border-t border-violet-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{track.telecaller?.name || 'Removed user'}</p>
                        {track.isActive ? (
                          <span className="text-[11px] font-semibold uppercase text-emerald-700">Current owner</span>
                        ) : (
                          <span className="text-[11px] font-semibold uppercase text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Reassigned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-violet-700">
                        Assigned {new Date(track.assignedAt).toLocaleString()}
                        {track.endedAt ? ` | until ${new Date(track.endedAt).toLocaleString()}` : ''}
                      </p>
                      {track.history.length > 0 ? (
                        <div className="divide-y divide-violet-200 border-t border-violet-200">
                          {track.history.map((entry, index) => (
                            <div key={index} className="flex items-start gap-2 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-semibold shrink-0 ${statusBadgeClass(entry.statusColor)}`}>
                                {entry.statusName}
                              </span>
                              <div className="min-w-0">
                                {entry.remark && <p className="text-sm text-slate-900 break-words">"{entry.remark}"</p>}
                                <p className="text-xs text-violet-700">{new Date(entry.changedAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-violet-800">Not started</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedLead(null)}
                className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isStatusManagerOpen && <MetaLeadStatusManager onClose={handleCloseStatusManager} />}

      {isAssignOpen && (
        <MetaLeadAssignModal telecallers={telecallers} onClose={() => setIsAssignOpen(false)} onAssigned={handleAssigned} />
      )}
    </div>
  );
};

export default MetaLeadsPage;
