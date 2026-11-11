import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BellRing, Plus, Trash2, X, Megaphone, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: [],
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', formData);
      toast.success('Notice published successfully');
      setIsOpen(false);
      setFormData({
        title: '',
        content: '',
        targetRoles: [],
      });
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to dispatch announcement');
    }
  };

  const handleRoleToggle = (role) => {
    const current = [...formData.targetRoles];
    const index = current.indexOf(role);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(role);
    }
    setFormData({ ...formData, targetRoles: current });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to terminate this announcement notice?')) return;

    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Notice terminated');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete notice');
    }
  };

  const isAuthorisedToPost = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-500" /> Bulletin Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-1">Read institute-wide updates, notifications, and directives.</p>
        </div>
        {isAuthorisedToPost && (
          <button
            onClick={() => setIsOpen(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" /> Dispatch Notice
          </button>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div key={ann._id} className="glass-card p-6 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Megaphone className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{ann.title}</h3>
                    </div>
                    {isAuthorisedToPost && (
                      <button
                        onClick={() => handleDelete(ann._id)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{ann.content}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-100 mt-5 pt-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> By {ann.createdBy?.name} ({ann.createdBy?.role})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Published {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {isAuthorisedToPost && (
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                      <span className="text-slate-500 mr-1 font-semibold uppercase text-[11px]">Targets:</span>
                      {ann.targetRoles?.length > 0 ? (
                        ann.targetRoles.map((r) => (
                          <span key={r} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] uppercase">
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[8px] uppercase">All roles</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-slate-500 font-semibold">
              No active bulletin announcements posted.
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" /> Dispatch Notice Announcement
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Independence Day Holiday Notification"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Roles (Check to restrict, leave unchecked for ALL)</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['student', 'teacher', 'accountant', 'counsellor', 'manager'].map((r) => {
                    const isChecked = formData.targetRoles.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => handleRoleToggle(r)}
                        className={`p-2 border rounded-xl text-center text-xs font-semibold uppercase cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notice content</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type bulletin text..."
                  rows="5"
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
