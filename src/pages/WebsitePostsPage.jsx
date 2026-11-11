import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import {
  Newspaper, FileText, Plus, Search, Edit3, Trash2, X, ExternalLink, Upload, Image as ImageIcon,
  Loader2, Globe, CalendarDays, Eye, EyeOff,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import HtmlEditor from '../components/HtmlEditor';

// Blog and newsroom posts of the public website (iiae.in/blog, iiae.in/newsroom).
// One page handles both; `kind` picks which. API: /api/posts/admin/<kind> (see Nodejs/docs/POSTS.md).

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
/** Origin that serves images uploaded here ("/uploads/posts/..."). */
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');
/** The public website, for "View on site" links and the imported posts' "/storage/..." images. */
export const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL || 'https://iiae.in').replace(/\/+$/, '');

export const KINDS = {
  blog: {
    title: 'Blog Posts',
    singular: 'blog post',
    path: '/blog',
    icon: FileText,
    blurb: 'Articles shown at iiae.in/blog. Published posts appear on the website within a minute.',
  },
  newsroom: {
    title: 'Newsroom',
    singular: 'news post',
    path: '/newsroom',
    icon: Newspaper,
    blurb: 'News shown at iiae.in/newsroom; the three newest also appear under "Campus News" on the home page.',
  },
};

/** Same rule as the API: "What Is The Age Limit For AME?" -> "what-is-the-age-limit-for-ame" */
export const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');

/** Absolute URL of a post image wherever it is stored. */
export const imageSrc = (image) => {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/uploads/')) return `${API_ORIGIN}${image}`;
  return `${WEBSITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

export async function uploadPostImage(file) {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post('/posts/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.url;
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ title: '', slug: '', date: today(), status: 'published', excerpt: '', image: '', html: '' });

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error ? <p className="text-[11px] text-rose-600 mt-1">{error}</p> : hint ? <p className="text-[11px] text-slate-400 mt-1">{hint}</p> : null}
  </div>
);

const StatusBadge = ({ status }) =>
  status === 'published' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><Eye className="w-3 h-3" /> Published</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded"><EyeOff className="w-3 h-3" /> Draft</span>
  );

const WebsitePostsPage = ({ kind = 'blog' }) => {
  const meta = KINDS[kind] || KINDS.blog;
  const Icon = meta.icon;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Editor modal: null, { mode: 'create' } or { mode: 'edit', id }
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingPost, setLoadingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/posts/admin/${kind}`);
      setPosts(data.posts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to load ${meta.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.title, p.slug, p.excerpt].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [posts, search, statusFilter]);

  const counts = useMemo(
    () => ({ published: posts.filter((p) => p.status === 'published').length, draft: posts.filter((p) => p.status === 'draft').length }),
    [posts]
  );

  const openCreate = () => {
    setForm(emptyForm());
    setSlugTouched(false);
    setFieldErrors({});
    setEditor({ mode: 'create' });
  };

  const openEdit = async (post) => {
    setFieldErrors({});
    setSlugTouched(true);
    setEditor({ mode: 'edit', id: post._id });
    setLoadingPost(true);
    try {
      const { data } = await api.get(`/posts/admin/${kind}/${post._id}`);
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        date: data.date || today(),
        status: data.status || 'published',
        excerpt: data.excerpt || '',
        image: data.image || '',
        html: data.html || '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load the post');
      setEditor(null);
    } finally {
      setLoadingPost(false);
    }
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
  };

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const onTitleChange = (title) => {
    update(slugTouched ? { title } : { title, slug: slugify(title) });
  };

  const onCoverFile = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadPostImage(file);
      update({ image: url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    setFieldErrors({});
    const payload = {
      title: form.title,
      slug: form.slug,
      date: form.date,
      status: form.status,
      excerpt: form.excerpt,
      image: form.image,
      html: form.html,
    };
    try {
      if (editor.mode === 'create') {
        await api.post(`/posts/admin/${kind}`, payload);
        toast.success(`${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} created`);
      } else {
        await api.put(`/posts/admin/${kind}/${editor.id}`, payload);
        toast.success('Changes saved');
      }
      setEditor(null);
      fetchPosts();
    } catch (error) {
      const data = error.response?.data || {};
      if (data.errors) setFieldErrors(data.errors);
      toast.error(data.message || 'Could not save the post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const post = confirmDelete;
    setConfirmDelete(null);
    if (!post) return;
    try {
      await api.delete(`/posts/admin/${kind}/${post._id}`);
      toast.success('Post deleted');
      setPosts((prev) => prev.filter((p) => p._id !== post._id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the post');
    }
  };

  const siteUrl = (slug) => `${WEBSITE_URL}${meta.path}/${slug}`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Icon className="w-6 h-6 text-amber-500" /> {meta.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{meta.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${WEBSITE_URL}${meta.path}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg px-3 py-2"
          >
            <Globe className="w-4 h-4" /> View on site
          </a>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4.5 h-4.5" /> New {meta.singular}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or slug…"
            className="input-field pl-10"
            aria-label="Search posts"
          />
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold">
          {[
            ['all', `All (${posts.length})`],
            ['published', `Published (${counts.published})`],
            ['draft', `Drafts (${counts.draft})`],
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card py-16 text-center text-slate-500 font-semibold">
          {posts.length === 0 ? (
            <>
              No {meta.title.toLowerCase()} yet.
              <p className="text-xs font-normal mt-2">
                Click “New {meta.singular}”, or run <code className="font-mono bg-slate-100 px-1 rounded">npm run seed:posts</code> on the API server to import the posts of the old site.
              </p>
            </>
          ) : (
            'No posts match this search'
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-semibold">Post</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell w-28">Date</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell w-32">Status</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell w-44">Last edited</th>
                <th className="px-4 py-3 font-semibold text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((post) => (
                <tr key={post._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-12 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {post.image ? (
                          <img src={imageSrc(post.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate" title={post.title}>{post.title}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate" title={post.slug}>{meta.path}/{post.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden md:table-cell">{formatDate(post.date)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={post.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell whitespace-nowrap">
                    {post.updatedAt ? new Date(post.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    {post.updatedBy?.name ? <span className="block text-[11px] text-slate-400">by {post.updatedBy.name}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === 'published' && (
                        <a
                          href={siteUrl(post.slug)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open on the website"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        title="Edit"
                        aria-label={`Edit ${post.title}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(post)}
                        title="Delete"
                        aria-label={`Delete ${post.title}`}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor modal */}
      {editor && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="post-editor-title">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 id="post-editor-title" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icon className="w-5 h-5 text-amber-500" /> {editor.mode === 'create' ? `New ${meta.singular}` : `Edit ${meta.singular}`}
              </h3>
              <button type="button" onClick={closeEditor} className="text-slate-500 hover:text-slate-600 cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPost ? (
              <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading post…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                      <Field label="Title" error={fieldErrors.title}>
                        <input
                          type="text"
                          required
                          value={form.title}
                          onChange={(e) => onTitleChange(e.target.value)}
                          placeholder="e.g. What Is The Age Limit For AME?"
                          className="input-field"
                          aria-label="Title"
                        />
                      </Field>

                      <Field
                        label="URL slug"
                        error={fieldErrors.slug}
                        hint={`${WEBSITE_URL}${meta.path}/${form.slug || '…'}${editor.mode === 'edit' ? ' — changing it breaks links to the old address' : ''}`}
                      >
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => { setSlugTouched(true); update({ slug: e.target.value }); }}
                          onBlur={() => update({ slug: slugify(form.slug) })}
                          placeholder="auto-generated from the title"
                          className="input-field font-mono text-xs"
                          aria-label="URL slug"
                        />
                      </Field>

                      <Field label="Excerpt" hint="Shown on the listing cards and as the page description in search results (1–2 sentences)." error={fieldErrors.excerpt}>
                        <textarea
                          rows={3}
                          value={form.excerpt}
                          onChange={(e) => update({ excerpt: e.target.value })}
                          maxLength={1000}
                          className="input-field"
                          aria-label="Excerpt"
                        />
                      </Field>
                    </div>

                    <div className="space-y-5">
                      <Field label="Publish date" error={fieldErrors.publishedAt}>
                        <div className="relative">
                          <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="date"
                            required
                            value={form.date}
                            onChange={(e) => update({ date: e.target.value })}
                            className="input-field pl-9"
                            aria-label="Publish date"
                          />
                        </div>
                      </Field>

                      <Field label="Status" error={fieldErrors.status}>
                        <select value={form.status} onChange={(e) => update({ status: e.target.value })} className="input-field" aria-label="Status">
                          <option value="published">Published (visible on the website)</option>
                          <option value="draft">Draft (hidden)</option>
                        </select>
                      </Field>

                      <Field label="Cover image" error={fieldErrors.image} hint="JPG, PNG, WEBP or GIF up to 3 MB, or paste an image URL.">
                        <div className="space-y-2">
                          <div className="w-full h-36 rounded-lg bg-slate-100 border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                            {form.image ? (
                              <img src={imageSrc(form.image)} alt="Cover preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                          <div className="flex gap-2">
                            <label className={`inline-flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 ${uploadingCover ? 'opacity-60 pointer-events-none' : ''}`}>
                              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              {uploadingCover ? 'Uploading…' : 'Upload'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => onCoverFile(e.target.files?.[0])}
                                aria-label="Upload cover image"
                              />
                            </label>
                            {form.image && (
                              <button type="button" onClick={() => update({ image: '' })} className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer">
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={form.image}
                            onChange={(e) => update({ image: e.target.value.trim() })}
                            placeholder="/uploads/posts/… or https://…"
                            className="input-field font-mono text-[11px]"
                            aria-label="Cover image URL"
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  <Field label="Content" error={fieldErrors.html}>
                    <HtmlEditor value={form.html} onChange={(html) => update({ html })} onUploadImage={async (file) => imageSrc(await uploadPostImage(file))} />
                  </Field>
                </div>

                <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    {form.status === 'published' ? 'Saving publishes the post on the website right away.' : 'Drafts are only visible here.'}
                  </p>
                  <div className="flex items-center gap-2 ml-auto">
                    <button type="button" onClick={closeEditor} className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer" disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {editor.mode === 'create' ? (form.status === 'draft' ? 'Save draft' : 'Publish') : 'Save changes'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete this ${meta.singular}?`}
        message={confirmDelete ? `"${confirmDelete.title}" will be removed from the website. This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default WebsitePostsPage;
