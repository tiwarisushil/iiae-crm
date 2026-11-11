import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { GraduationCap, Plus, Search, Edit3, Trash2, X, Users, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const BatchAllocationsPage = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isManageRosterOpen, setIsManageRosterOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    schedule: '',
    students: [],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      courseId: '',
      teacherId: '',
      schedule: '',
      students: [],
    });
  };

  useEffect(() => {
    fetchBatches();
    fetchCourses();
    fetchTeachers();
    fetchStudents();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/batches');
      setBatches(response.data);
    } catch (error) {
      toast.error('Failed to retrieve batch records');
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

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/users?role=teacher');
      setTeachers(response.data);
    } catch (e) {}
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data);
    } catch (e) {}
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches', formData);
      toast.success('Batch cohort created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleEditClick = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      courseId: batch.course?._id || batch.course || '',
      teacherId: batch.teacher?._id || batch.teacher || '',
      schedule: batch.schedule || '',
      students: batch.students?.map(s => s._id || s) || [],
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/batches/${selectedBatch._id}`, formData);
      toast.success('Batch settings updated');
      setIsEditOpen(false);
      resetForm();
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update batch');
    }
  };

  const handleManageRosterClick = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      courseId: batch.course?._id || batch.course || '',
      teacherId: batch.teacher?._id || batch.teacher || '',
      schedule: batch.schedule || '',
      students: batch.students?.map(s => s._id || s) || [],
    });
    setIsManageRosterOpen(true);
  };

  const handleRosterToggle = (studentId) => {
    const currentList = [...formData.students];
    const index = currentList.indexOf(studentId);
    
    if (index > -1) {
      currentList.splice(index, 1);
    } else {
      currentList.push(studentId);
    }
    
    setFormData({ ...formData, students: currentList });
  };

  const handleRosterSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/batches/${selectedBatch._id}`, {
        students: formData.students
      });
      toast.success('Batch student roster updated successfully');
      setIsManageRosterOpen(false);
      fetchBatches();
    } catch (error) {
      toast.error('Failed to update student roster');
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== 'admin') {
      toast.error('Only Administrators are authorized to delete batch cohorts');
      return;
    }
    
    if (!window.confirm('Are you sure you want to terminate this batch? Enrolled students will be unallocated.')) return;

    try {
      await api.delete(`/batches/${id}`);
      toast.success('Batch terminated successfully');
      fetchBatches();
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const filteredBatches = batches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-500" /> Batch Allocations
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage student classroom allocations, timings, and teacher assignments.</p>
        </div>
        {user?.role !== 'teacher' && (
          <button
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" /> Establish Batch Cohort
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="p-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by batch name..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Batches Table */}
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
                  <th className="p-4">Batch Details</th>
                  <th className="p-4">Course Program</th>
                  <th className="p-4">Assigned Instructor</th>
                  <th className="p-4">Timings / Schedule</th>
                  <th className="p-4 text-center">Roster strength</th>
                  {user?.role !== 'teacher' && <th className="p-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{b.name}</td>
                      <td className="p-4 font-semibold text-slate-700">{b.course?.name}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 capitalize">{b.teacher?.name || 'Unassigned'}</p>
                        {b.teacher?.phone && <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{b.teacher.phone}</p>}
                      </td>
                      <td className="p-4">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {b.schedule || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          disabled={user?.role === 'teacher'}
                          onClick={() => handleManageRosterClick(b)}
                          className="px-2.5 py-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 disabled:hover:bg-amber-500/10 rounded-md font-bold text-[11px] uppercase flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" /> {b.students?.length || 0} Students
                        </button>
                      </td>
                      {user?.role !== 'teacher' && (
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(b)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(b._id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={user?.role === 'teacher' ? 5 : 6} className="p-8 text-center text-slate-500 font-semibold">No batches allocated</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-500" /> Define Batch Cohort
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AME Batch 2026-A"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Syllabus Course</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Target Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assigned Teacher</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Instructor</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Timings / Weekly Schedule</label>
                <input
                  type="text"
                  required
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="e.g. Monday - Friday, 9:00 AM - 1:00 PM"
                  className="input-field"
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
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" /> Edit Batch settings
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AME Batch 2026-A"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Syllabus Course</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Target Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assigned Teacher</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Instructor</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Schedule</label>
                <input
                  type="text"
                  required
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="e.g. Monday - Friday, 9:00 AM - 1:00 PM"
                  className="input-field"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Update Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE ROSTER MODAL */}
      {isManageRosterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Manage Roster: {formData.name}
              </h3>
              <button onClick={() => setIsManageRosterOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRosterSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-slate-200 shrink-0 text-slate-500 font-medium text-xs">
                Check students to enroll them in this batch cohort. Unchecking will release them.
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {students.length > 0 ? (
                  students
                    .filter(s => !s.profile?.course || s.profile?.course?._id === formData.courseId || s.profile?.course === formData.courseId)
                    .map((s) => {
                      const isEnrolled = formData.students.includes(s._id);
                      return (
                        <div
                          key={s._id}
                          onClick={() => handleRosterToggle(s._id)}
                          className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${
                            isEnrolled
                              ? 'border-amber-500/40 bg-amber-500/[0.02]'
                              : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 capitalize">{s.name}</p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{s.email} | Roll: {s.profile?.studentId || 'N/A'}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnrolled}
                            onChange={() => {}} // toggled by outer click
                            className="w-4 h-4 accent-amber-500"
                          />
                        </div>
                      );
                    })
                ) : (
                  <div className="py-12 text-center text-slate-500 font-semibold">No students registered in directory</div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsManageRosterOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Apply Roster changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchAllocationsPage;
