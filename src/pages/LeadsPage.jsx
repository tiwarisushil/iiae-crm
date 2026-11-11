import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PhoneCall, Plus, Search, Edit3, MessageSquarePlus, UserPlus, X, Calendar, BookOpen, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LeadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseId: '',
    remark: '',
  });

  const [logData, setLogData] = useState({
    remark: '',
    status: '',
    registrationBy: '',
  });
  const [shareLink, setShareLink] = useState('');

  const [assigneeId, setAssigneeId] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      courseId: '',
      remark: '',
    });
  };

  useEffect(() => {
    fetchLeads();
    fetchCourses();
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchTelecallers();
    }
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leads');
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load lead files');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (e) {}
  };

  const fetchTelecallers = async () => {
    try {
      const response = await api.get('/users?role=counsellor');
      setTelecallers(response.data);
    } catch (e) {}
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads', formData);
      toast.success('Inquiry logged successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit query');
    }
  };

  const handleLogClick = (lead) => {
    setSelectedLead(lead);
    setLogData({
      remark: '',
      status: lead.status,
      registrationBy: lead.registrationBy || '',
    });
    setIsLogOpen(true);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    const needsFormChoice = logData.status === 'registered' && !selectedLead?.formSubmitted;
    if (needsFormChoice && !logData.registrationBy) {
      toast.error('Choose who will fill the registration form');
      return;
    }
    try {
      const response = await api.post(`/leads/${selectedLead._id}/call-logs`, logData);
      setIsLogOpen(false);
      fetchLeads();
      if (logData.status === 'registered' && response.data.registrationPath && !response.data.formSubmitted) {
        toast.success('The lead stays on its current status until the form is submitted');
        if (response.data.registrationBy === 'counsellor') {
          navigate(response.data.registrationPath);
        } else {
          setShareLink(`${window.location.origin}${response.data.registrationPath}`);
        }
      } else {
        toast.success('Call log/remark recorded');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to append call log');
    }
  };

  const handleAssignClick = (lead) => {
    setSelectedLead(lead);
    setAssigneeId(lead.assignedTo?._id || lead.assignedTo || '');
    setIsAssignOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/leads/${selectedLead._id}/assign`, {
        telecallerId: assigneeId,
      });
      toast.success('Lead assigned successfully');
      setIsAssignOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to reallocate lead');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'interested': return 'bg-amber-100 text-amber-800';
      case 'callback': return 'bg-blue-100 text-blue-800';
      case 'follow_up': return 'bg-cyan-100 text-cyan-800';
      case 'not_picked': return 'bg-purple-100 text-purple-800';
      case 'not_eligible': return 'bg-rose-100 text-rose-800';
      case 'not_interested': return 'bg-slate-100 text-slate-800';
      case 'registered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  // Filter listings
  const filteredLeads = leads.filter((l) => {
    const nameMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      l.phone.includes(searchTerm);
    const statusMatch = statusFilter ? l.status === statusFilter : true;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-amber-500" /> Leads & Queries Inbox
          </h2>
          <p className="text-xs text-slate-500 mt-1">Capture candidate queries, assign callers, and track logs timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" /> Capture Query
          </button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name or phone..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Filter status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="">All Statuses</option>
            <option value="interested">Interested</option>
            <option value="callback">Callback</option>
            <option value="follow_up">Follow Up</option>
            <option value="not_picked">Not Picked</option>
            <option value="not_eligible">Not Eligible</option>
            <option value="not_interested">Not Interested</option>
            <option value="registered">Registered</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Desired Course</th>
                  <th className="p-4">Remarks Timeline</th>
                  <th className="p-4">Assigned Counsellor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Log/Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((l) => {
                    const lastLog = l.callLogs?.[l.callLogs.length - 1];
                    return (
                      <tr key={l._id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 leading-tight capitalize">{l.name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{l.phone} {l.email ? `| ${l.email}` : ''}</p>
                          {l.qualification && <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{l.qualification}</p>}
                          {l.address && <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{l.address}</p>}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700">{l.course?.name || 'N/A'}</span>
                        </td>
                        <td className="p-4 max-w-xs">
                          {lastLog ? (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-700 truncate font-medium">"{lastLog.remark}"</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase">
                                <span>{lastLog.caller}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span>{new Date(lastLog.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold text-[11px]">No follow-up logged</span>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 capitalize">{l.assignedTo?.name || 'Unallocated'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase font-bold ${getStatusBadge(l.status)}`}>
                            {l.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleLogClick(l)}
                              className="px-2 py-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" /> Call Log
                            </button>
                            {l.registrationPath && (
                              <button
                                onClick={() => {
                                  const link = `${window.location.origin}${l.registrationPath}`;
                                  if (l.registrationBy === 'counsellor') {
                                    navigate(l.registrationPath);
                                  } else {
                                    setShareLink(link);
                                  }
                                }}
                                className="px-2 py-1 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded font-bold text-[11px] uppercase cursor-pointer"
                              >
                                {l.registrationBy === 'counsellor' ? 'Fill form' : 'Form link'}
                              </button>
                            )}
                            {(user?.role === 'admin' || user?.role === 'manager') && (
                              <button
                                onClick={() => handleAssignClick(l)}
                                className="px-2 py-1 bg-slate-900/10 text-slate-800 hover:bg-slate-900/20 rounded font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" /> Assign
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">No queries registered in inbox</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INQUIRY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-500" /> Capture Query Enquiry
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Candidate Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Candidate mobile"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Candidate email"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Desired Course Program</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Enrolling Program</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Initial Remark / Notes</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="e.g. Student called to enquire about scholarship options..."
                  rows="3"
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Capture Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALL LOG / STATUS UPDATE MODAL */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Record Call Log: {selectedLead?.name}
              </h3>
              <button onClick={() => setIsLogOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Query Status</label>
                <select
                  required
                  value={logData.status}
                  onChange={(e) => setLogData({ ...logData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="interested">Interested</option>
                  <option value="callback">Callback scheduled</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="not_picked">Not Picked</option>
                  <option value="not_eligible">Not Eligible</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="registered">Registered (Entrance Exam Stage)</option>
                </select>
              </div>

              {logData.status === 'registered' && !selectedLead?.formSubmitted && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Who fills the registration form?</label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                      <input
                        type="radio"
                        name="registrationBy"
                        value="student"
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
                        value="counsellor"
                        checked={logData.registrationBy === 'counsellor'}
                        onChange={() => setLogData({ ...logData, registrationBy: 'counsellor' })}
                        className="mt-0.5"
                      />
                      <span>By counsellor — you fill the same form for this student.</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Call Log Details / Remarks</label>
                <textarea
                  required
                  value={logData.remark}
                  onChange={(e) => setLogData({ ...logData, remark: e.target.value })}
                  placeholder="Record summary of candidate interaction..."
                  rows="4"
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Record Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shareLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
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

      {/* ASSIGN MODAL */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" /> Allocate Lead: {selectedLead?.name}
              </h3>
              <button onClick={() => setIsAssignOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Counsellor</label>
                <select
                  required
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Unassigned (Open Queue)</option>
                  {telecallers.map((tc) => (
                    <option key={tc._id} value={tc._id}>{tc.name} ({tc.phone})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Update Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
