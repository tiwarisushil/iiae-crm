import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, Plus, Search, Edit3, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CourseCatalogPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    duration: '3 Years',
    baseFees: 150000,
    description: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      duration: '3 Years',
      baseFees: 150000,
      description: '',
    });
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to load course catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', formData);
      toast.success('New Course Catalog item created');
      setIsCreateOpen(false);
      resetForm();
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    }
  };

  const handleEditClick = (course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      duration: course.duration,
      baseFees: course.baseFees,
      description: course.description || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/courses/${selectedCourse._id}`, formData);
      toast.success('Course details updated successfully');
      setIsEditOpen(false);
      resetForm();
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== 'admin') {
      toast.error('Only Administrators are authorized to delete catalog items');
      return;
    }
    
    if (!window.confirm('Are you sure you want to terminate this course? This might affect existing registrations.')) return;

    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to delete course');
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-500" /> Course Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure baseline course curricula, descriptions, and standard pricing.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4.5 h-4.5" /> Define New Course
        </button>
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
            placeholder="Search by course name or code (e.g. AME)..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((c) => (
              <div key={c._id} className="glass-card p-5 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">
                      {c.code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold uppercase">{c.duration}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{c.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">₹{c.baseFees.toLocaleString()} Total Base Fees</p>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-3">{c.description || 'No course syllabus description provided.'}</p>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 mt-5 pt-3">
                  <button
                    onClick={() => handleEditClick(c)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-500 font-semibold">
              No courses configured in catalog
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" /> Add Course Program
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aircraft Maintenance Engineering"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. AME"
                    className="input-field font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration</label>
                  <input
                    type="text"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g. 3 Years"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Base Tuition Fees (INR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.baseFees}
                  onChange={(e) => setFormData({ ...formData, baseFees: Number(e.target.value) })}
                  placeholder="e.g. 150000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide brief outline of syllabus and requirements..."
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
                  Create Course
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
                <Edit3 className="w-5 h-5 text-amber-500" /> Edit Course Details
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aircraft Maintenance Engineering"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. AME"
                    className="input-field font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration</label>
                  <input
                    type="text"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g. 3 Years"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Base Tuition Fees (INR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.baseFees}
                  onChange={(e) => setFormData({ ...formData, baseFees: Number(e.target.value) })}
                  placeholder="e.g. 150000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide brief outline of syllabus and requirements..."
                  rows="3"
                  className="input-field resize-none"
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
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCatalogPage;
