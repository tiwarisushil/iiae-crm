import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { GraduationCap, Plus, Search, Edit3, Trash2, X, Upload, Image as ImageIcon, Loader2, Globe, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

// Faculty directory of the public website (iiae.in/faculties). API: /api/faculty/admin.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
const API_ORIGIN = API_BASE.replace(/\/api$/, '');
const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL || 'https://iiae.in').replace(/\/+$/, '');

const imageSrc = (image) => {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/uploads/')) return `${API_ORIGIN}${image}`;
  return `${WEBSITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

const emptyForm = () => ({ name: '', post: '', experience: '', competency: '', image: '', status: 'published', order: '' });

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error ? <p className="text-[11px] text-rose-600 mt-1">{error}</p> : hint ? <p className="text-[11px] text-slate-400 mt-1">{hint}</p> : null}
  </div>
);

const inputClass = 'input-field w-full';

export default function FacultyPage() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty/admin');
      setFaculty(data.faculty || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load faculty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculty.filter((member) => {
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;
      if (!q) return true;
      return [member.name, member.post, member.competency, member.experience].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [faculty, search, statusFilter]);

  const counts = useMemo(
    () => ({ published: faculty.filter((m) => m.status === 'published').length, hidden: faculty.filter((m) => m.status === 'hidden').length }),
    [faculty],
  );

  const openCreate = () => {
    setErrors({});
    setEditor({ id: null, ...emptyForm(), order: faculty.reduce((max, member) => Math.max(max, member.order || 0), 0) + 1 });
  };

  const openEdit = (member) => {
    setErrors({});
    setEditor({
      id: member._id,
      name: member.name || '',
      post: member.post || '',
      experience: member.experience || '',
      competency: member.competency || '',
      image: member.image || '',
      status: member.status || 'published',
      order: member.order ?? 0,
    });
  };

  const setField = (key, value) => setEditor((current) => (current ? { ...current, [key]: value } : current));

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post('/faculty/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setField('image', data.url);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setErrors({});
    const payload = {
      name: editor.name.trim(),
      post: editor.post.trim(),
      experience: editor.experience.trim(),
      competency: editor.competency.trim(),
      image: editor.image.trim(),
      status: editor.status,
      order: Number(editor.order),
    };
    try {
      if (editor.id) await api.put(`/faculty/admin/${editor.id}`, payload);
      else await api.post('/faculty/admin', payload);
      toast.success(editor.id ? 'Faculty member updated' : 'Faculty member added');
      setEditor(null);
      await load();
    } catch (error) {
      const body = error.response?.data;
      setErrors(body?.errors || {});
      toast.error(body?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/faculty/admin/${pendingDelete._id}`);
      toast.success('Faculty member removed');
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete');
    }
  };

  const move = async (member, direction) => {
    const index = faculty.findIndex((item) => item._id === member._id);
    const swapWith = faculty[index + direction];
    if (!swapWith) return;
    const next = [...faculty];
    next.splice(index, 1);
    next.splice(index + direction, 0, member);
    try {
      await Promise.all(next.map((item, position) => (
        item.order === position + 1 ? null : api.put(`/faculty/admin/${item._id}`, { order: position + 1 })
      )));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reorder');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-ame-orange" /> Faculty
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            People shown at iiae.in/faculties. Published members appear on the website within a minute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${WEBSITE_URL}/faculties`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg px-3 py-2"
          >
            <Globe className="w-4 h-4" /> View on site
          </a>
          <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4.5 h-4.5" /> New faculty
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, post or competency…"
            className="input-field pl-10"
            aria-label="Search faculty"
          />
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold">
          {[
            ['all', `All (${faculty.length})`],
            ['published', `Published (${counts.published})`],
            ['hidden', `Hidden (${counts.hidden})`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer ${statusFilter === value ? 'bg-ame-navy text-white border-ame-navy' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-500 font-semibold">
          {faculty.length === 0 ? (
            <>
              No faculty yet.
              <p className="text-xs font-normal mt-2">
                Click “New faculty”, or run <code className="font-mono bg-slate-100 px-1 rounded">npm run seed:faculty</code> on the API server to import the current directory.
              </p>
            </>
          ) : (
            'No faculty match this search'
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-semibold w-16">Order</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Post</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Competency</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell w-28">Status</th>
                <th className="px-4 py-3 font-semibold text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => {
                const index = faculty.findIndex((item) => item._id === member._id);
                return (
                  <tr key={member._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <button type="button" aria-label={`Move ${member.name} up`} disabled={index <= 0 || search || statusFilter !== 'all'} onClick={() => move(member, -1)} className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" aria-label={`Move ${member.name} down`} disabled={index < 0 || index >= faculty.length - 1 || search || statusFilter !== 'all'} onClick={() => move(member, 1)} className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {member.image ? (
                            <img src={imageSrc(member.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{member.name}</p>
                          <p className="text-[11px] text-slate-500 truncate md:hidden">{member.post}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{member.post}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{member.competency || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${member.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {member.status === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {member.status === 'published' ? 'Published' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => openEdit(member)} aria-label={`Edit ${member.name}`} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setPendingDelete(member)} aria-label={`Delete ${member.name}`} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={editor.id ? 'Edit faculty' : 'New faculty'}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !saving && setEditor(null)} />
          <form onSubmit={save} className="relative h-full w-full max-w-md bg-white shadow-xl overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editor.id ? 'Edit faculty' : 'New faculty'}</h2>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Field label="Name" error={errors.name}>
              <input className={inputClass} value={editor.name} onChange={(e) => setField('name', e.target.value)} required maxLength={200} />
            </Field>
            <Field label="Post" error={errors.post}>
              <input className={inputClass} value={editor.post} onChange={(e) => setField('post', e.target.value)} required maxLength={200} placeholder="Training Manager" />
            </Field>
            <Field label="Experience" error={errors.experience}>
              <textarea className={`${inputClass} min-h-20`} value={editor.experience} onChange={(e) => setField('experience', e.target.value)} maxLength={500} />
            </Field>
            <Field label="Competency" error={errors.competency}>
              <input className={inputClass} value={editor.competency} onChange={(e) => setField('competency', e.target.value)} maxLength={300} placeholder="B1.1 & BASIC" />
            </Field>
            <Field label="Photo" hint="JPG, PNG, WEBP or GIF, up to 3 MB. Leave blank to use the placeholder." error={errors.image}>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {editor.image ? <img src={imageSrc(editor.image)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                </label>
                {editor.image && (
                  <button type="button" onClick={() => setField('image', '')} className="text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Order" hint="Lower numbers are listed first." error={errors.order}>
                <input className={inputClass} type="number" min="0" max="10000" value={editor.order} onChange={(e) => setField('order', e.target.value)} required />
              </Field>
              <Field label="Status" error={errors.status}>
                <select className={inputClass} value={editor.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditor(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving || uploading} className="btn-primary disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove faculty member?"
        message={pendingDelete ? `${pendingDelete.name} will be taken off the directory. This cannot be undone.` : ''}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
