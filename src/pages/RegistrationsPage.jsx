import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, CheckCircle, XCircle, User, Phone, Mail, Award, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RegistrationLeadModal from '../components/RegistrationLeadModal';
import DeleteRecordButton from '../components/DeleteRecordButton';
import MarkRegistrationPaidButton from '../components/MarkRegistrationPaidButton';

const fileHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const RegistrationsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.pathname.endsWith('/paid') ? 'paid' : 'unpaid');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  // Unpaid registrations are worked as leads: admin and manager pick each one's counsellor here.
  const canAssign = activeTab === 'unpaid' && ['admin', 'manager'].includes(user?.role);
  const [counsellors, setCounsellors] = useState([]);
  const [assigningId, setAssigningId] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [detailId, setDetailId] = useState('');
  // Admins can delete registrations; the paid tab then gets an actions column
  const canDelete = user?.role === 'admin';
  const [phases, setPhases] = useState({ phases: [], hasUnphased: false });
  const [phaseFilter, setPhaseFilter] = useState('');

  useEffect(() => {
    setActiveTab(location.pathname.endsWith('/paid') ? 'paid' : 'unpaid');
  }, [location.pathname]);

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab, phaseFilter]);

  useEffect(() => {
    api.get('/registrations/phases')
      .then((response) => setPhases({ phases: response.data?.phases || [], hasUnphased: Boolean(response.data?.hasUnphased) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canAssign || counsellors.length) return;
    api.get('/users?role=counsellor')
      .then((response) => setCounsellors((response.data || []).filter((c) => c.status !== 'inactive')))
      .catch(() => {});
  }, [canAssign]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // Fetch users with role student filtered by registration status
      const phaseQuery = phaseFilter ? `&examPhase=${encodeURIComponent(phaseFilter)}` : '';
      const response = await api.get(`/users?role=student&registrationFeePaid=${activeTab === 'paid'}${phaseQuery}`);
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const visibleStudents = students.filter((student) => {
    const registered = new Date(student.createdAt);
    if (Number.isNaN(registered.getTime())) return true;
    if (fromDate && registered < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && registered > new Date(`${toDate}T23:59:59.999`)) return false;
    if (canAssign && counsellorFilter) {
      const owner = student.lead?.assignedTo?._id || '';
      if (counsellorFilter === 'none' ? owner : owner !== counsellorFilter) return false;
    }
    return true;
  });

  const removeStudent = (studentId) => setStudents((current) => current.filter((item) => item._id !== studentId));

  const showRemark = (studentId, lastRemark) => setStudents((current) => current.map((item) => (
    item._id === studentId ? { ...item, lastRemark } : item
  )));

  const handleAssign = async (student, counsellorId) => {
    setAssigningId(student._id);
    try {
      const response = await api.post('/leads/registrations/assign', {
        studentIds: [student._id],
        counsellorId: counsellorId || null,
      });
      const counsellor = counsellors.find((c) => c._id === counsellorId);
      setStudents((current) => current.map((item) => (item._id === student._id
        ? { ...item, lead: { ...(item.lead || {}), assignedTo: counsellor ? { _id: counsellor._id, name: counsellor.name } : null } }
        : item)));
      toast.success(response.data?.message || 'Counsellor updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not change the counsellor');
    } finally {
      setAssigningId('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-ame-orange" /> Candidate Registrations
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {user?.role === 'counsellor'
            ? (activeTab === 'unpaid'
              ? 'Unpaid registrations assigned to you. Call them, add a remark after each call, and help them pay.'
              : 'Students whose registration form you submitted.')
            : 'Filled registration forms. Unpaid until the fee is marked paid. Admin and manager see every student.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 sm:flex">
          <button
            onClick={() => navigate('/dashboard/registrations/paid')}
            className={`pb-3 text-[11px] sm:text-xs font-bold uppercase tracking-wide border-b-2 px-2 sm:px-6 text-center transition-all cursor-pointer ${
              activeTab === 'paid'
                ? 'border-ame-orange text-ame-orange'
                : 'border-transparent text-slate-500 hover:text-slate-600'
            }`}
          >
            Paid<span className="hidden sm:inline"> Registrations</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/registrations/unpaid')}
            className={`pb-3 text-[11px] sm:text-xs font-bold uppercase tracking-wide border-b-2 px-2 sm:px-6 text-center transition-all cursor-pointer ${
              activeTab === 'unpaid'
                ? 'border-ame-orange text-ame-orange'
                : 'border-transparent text-slate-500 hover:text-slate-600'
            }`}
          >
            Unpaid<span className="hidden sm:inline"> Registrations</span>
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-3 sm:flex sm:flex-row">
          {(phases.phases.length > 0 || phases.hasUnphased) && (
            <select
              aria-label="Filter by exam phase"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="input-field col-span-3 min-w-0 py-2 sm:col-span-1 sm:max-w-[180px]"
            >
              <option value="">All phases</option>
              {phases.phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              {phases.hasUnphased && <option value="none">No phase (earlier)</option>}
            </select>
          )}
          <input type="date" aria-label="Registered from" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="input-field min-w-0 py-2 sm:max-w-[180px]" />
          <span className="text-xs font-semibold text-slate-500">to</span>
          <input type="date" aria-label="Registered to" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="input-field min-w-0 py-2 sm:max-w-[180px]" />
          {canAssign && (
            <select
              aria-label="Filter by counsellor"
              value={counsellorFilter}
              onChange={(e) => setCounsellorFilter(e.target.value)}
              className="input-field col-span-3 min-w-0 py-2 sm:col-span-1 sm:max-w-[200px]"
            >
              <option value="">All counsellors</option>
              <option value="none">Unassigned</option>
              {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          {(fromDate || toDate) && (
            <button type="button" onClick={() => { setFromDate(''); setToDate(''); }} className="col-span-3 text-[11px] font-bold text-ame-orange hover:text-amber-700 sm:col-span-1">
              All dates
            </button>
          )}
        </div>
      </div>

      {/* Roster list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${activeTab === 'unpaid' ? 'min-w-[1080px]' : 'min-w-[720px]'} text-left text-sm border-collapse`}>
              <thead className="brand-header">
                <tr className="font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4 whitespace-nowrap">Candidate Profile</th>
                  <th className="p-4 whitespace-nowrap">Contact Details</th>
                  <th className="p-4 whitespace-nowrap">Exam Roll No</th>
                  {activeTab === 'unpaid' && <th className="p-4 whitespace-nowrap">Counsellor</th>}
                  {activeTab === 'unpaid' && <th className="p-4 whitespace-nowrap">Last Remark</th>}
                  <th className="p-4 text-center whitespace-nowrap">Payment Status</th>
                  {activeTab === 'unpaid' && <th className="p-4 text-right whitespace-nowrap">Details</th>}
                  {activeTab === 'paid' && canDelete && <th className="p-4 text-right whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {visibleStudents.length > 0 ? (
                  visibleStudents.map((student) => {
                    const profile = student.profile || {};
                    return (
                      <tr key={student._id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {/* <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">
                              {student.name.split(' ').map(n=>n[0]).join('').toUpperCase()}
                            </div> */}
                            <div>
                              <Link to={`/dashboard/registrations/student/${student._id}`} className="font-bold text-slate-900 leading-tight capitalize hover:text-ame-orange">
                                {student.name}
                              </Link>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5 uppercase">
                                Registered: {new Date(student.createdAt).toLocaleDateString()}
                              </p>
                              {profile.registeredBy?.name && (
                                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">By {profile.registeredBy.name}</p>
                              )}
                              {fileHref(profile.acknowledgementUrl) && (
                                <a href={fileHref(profile.acknowledgementUrl)} target="_blank" rel="noreferrer" className="inline-block text-[11px] font-bold text-blue-600 mt-0.5 hover:underline">
                                  Acknowledgement PDF
                                </a>
                              )}
                              {(profile.extraAnswers || []).map((answer) => {
                                const href = fileHref(answer.value);
                                return (
                                  <p key={answer.fieldId} className="text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-semibold">{answer.label}:</span>{' '}
                                    {href ? (
                                      <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-blue-600">Open file</a>
                                    ) : answer.value}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 space-y-1">
                          <p className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-500" /> {student.email}
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-500" /> {student.phone}
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap font-mono font-bold text-slate-600">
                          {profile.studentId || 'Not Generated'}
                          {profile.examPhase && (
                            <p className="mt-0.5 font-sans text-[11px] font-semibold text-slate-500">{profile.examPhase}</p>
                          )}
                          {profile.currentExamPhase && (
                            <p className="mt-0.5 font-sans text-[11px] font-semibold text-blue-600">Registered again later ({profile.currentExamPhase})</p>
                          )}
                        </td>
                        {activeTab === 'unpaid' && (
                          <td className="p-4 whitespace-nowrap">
                            {canAssign ? (
                              <select
                                aria-label={`Counsellor for ${student.name}`}
                                value={student.lead?.assignedTo?._id || ''}
                                disabled={assigningId === student._id}
                                onChange={(e) => handleAssign(student, e.target.value)}
                                className="input-field min-w-[160px] py-1.5 text-sm disabled:opacity-60"
                              >
                                <option value="">Unassigned</option>
                                {/* Keep the current counsellor listed even if they are no longer active */}
                                {student.lead?.assignedTo && !counsellors.some((c) => c._id === student.lead.assignedTo._id) && (
                                  <option value={student.lead.assignedTo._id}>{student.lead.assignedTo.name}</option>
                                )}
                                {counsellors.map((c) => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </select>
                            ) : student.lead?.assignedTo?.name
                              ? <span className="font-semibold text-slate-900 capitalize">{student.lead.assignedTo.name}</span>
                              : <span className="text-slate-500">Unassigned</span>}
                          </td>
                        )}
                        {activeTab === 'unpaid' && (
                          <td className="p-4 max-w-[240px]">
                            {student.lastRemark ? (
                              <>
                                <p className="line-clamp-2 text-xs text-slate-700">{student.lastRemark.remark}</p>
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                  {student.lastRemark.caller} · {new Date(student.lastRemark.date).toLocaleDateString()}
                                </p>
                              </>
                            ) : <span className="text-xs text-slate-500">No remarks yet</span>}
                          </td>
                        )}
                        <td className="p-4 text-center">
                          {profile.registrationFeePaid ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                <CheckCircle className="w-3.5 h-3.5" /> PAID
                              </span>
                              {profile.registrationPaidBy?.name && !profile.currentExamPhase && (
                                <span className="text-[10px] font-semibold text-slate-500">Marked by {profile.registrationPaidBy.name}</span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                              <XCircle className="w-3.5 h-3.5" /> UNPAID
                            </span>
                          )}
                        </td>
                        {activeTab === 'unpaid' && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!profile.currentExamPhase && (
                                <MarkRegistrationPaidButton studentId={student._id} name={student.name} onPaid={() => removeStudent(student._id)} />
                              )}
                              <button type="button" onClick={() => setDetailId(student._id)} className="whitespace-nowrap rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-ame-orange hover:text-ame-orange">
                                View details
                              </button>
                              <DeleteRecordButton compact kind="registration" id={student._id} name={student.name} email={student.email} phone={student.phone} onDeleted={() => removeStudent(student._id)} />
                            </div>
                          </td>
                        )}
                        {activeTab === 'paid' && canDelete && (
                          <td className="p-4 text-right">
                            <DeleteRecordButton compact kind="registration" id={student._id} name={student.name} email={student.email} phone={student.phone} paid onDeleted={() => removeStudent(student._id)} />
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'unpaid' ? 7 : (canDelete ? 5 : 4)} className="p-8 text-center text-slate-500 font-semibold">
                      {(fromDate || toDate || counsellorFilter || phaseFilter) ? 'No registrations match these filters.' : (user?.role === 'counsellor' && activeTab === 'unpaid' ? 'No unpaid registrations are assigned to you.' : 'No registrations found in this category.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {detailId && (
        <RegistrationLeadModal
          studentId={detailId}
          canOpenForm
          onClose={() => setDetailId('')}
          onRemarkAdded={showRemark}
        />
      )}
    </div>
  );
};

export default RegistrationsPage;
