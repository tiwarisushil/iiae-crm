import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { SearchCheck, Plus, Search, Edit3, RotateCcw, X, Globe, ExternalLink } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

// SEO title and meta description of each public website page (iiae.in). API: /api/seo/admin.
// A page without an entry keeps its built-in default; deleting an entry restores the default.

const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL || 'https://iiae.in').replace(/\/+$/, '');

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 500;
// Roughly what Google shows before truncating
export const TITLE_IDEAL = 60;
export const DESCRIPTION_IDEAL = 160;

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error ? <p className="text-[11px] text-rose-600 mt-1">{error}</p> : hint ? <p className="text-[11px] text-slate-400 mt-1">{hint}</p> : null}
  </div>
);

const Counter = ({ value, ideal }) => (
  <span className={`text-[11px] font-semibold ${value.length > ideal ? 'text-amber-600' : 'text-slate-400'}`}>
    {value.length} / {ideal}
  </span>
);

const inputClass = 'input-field w-full';

/**
 * One row per website page: the catalog of pages, each with its CRM entry if it has one,
 * plus entries whose page is no longer listed (e.g. a deleted post).
 */
export const mergeRows = (routes, entries) => {
  const byRoute = new Map(entries.map((entry) => [entry.route, entry]));
  const rows = routes.map((page) => ({ ...page, entry: byRoute.get(page.route) || null }));
  const listed = new Set(routes.map((page) => page.route));
  for (const entry of entries) {
    if (!listed.has(entry.route)) {
      rows.push({ route: entry.route, label: entry.route, group: 'Not on the site', defaultTitle: '', defaultDescription: '', entry });
    }
  }
  return rows;
};

export default function SeoPage() {
  const [routes, setRoutes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [pendingReset, setPendingReset] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, entriesRes] = await Promise.all([api.get('/seo/admin/routes'), api.get('/seo/admin')]);
      setRoutes(routesRes.data.routes || []);
      setEntries(entriesRes.data.entries || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load SEO settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => mergeRows(routes, entries), [routes, entries]);
  const rowByRoute = useMemo(() => new Map(rows.map((row) => [row.route, row])), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'custom' && !row.entry) return false;
      if (filter === 'default' && row.entry) return false;
      if (!q) return true;
      return [row.route, row.label, row.entry?.title, row.entry?.description, row.defaultTitle]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [rows, search, filter]);

  // Pages for the "New SEO entry" picker: only those without an entry, grouped like the site
  const pickerGroups = useMemo(() => {
    const groups = new Map();
    for (const row of rows) {
      if (row.entry) continue;
      if (!groups.has(row.group)) groups.set(row.group, []);
      groups.get(row.group).push(row);
    }
    return [...groups.entries()];
  }, [rows]);

  const openFor = (row) => {
    setErrors({});
    setEditor({
      id: row?.entry?._id || null,
      route: row?.route || '',
      title: row?.entry?.title || '',
      description: row?.entry?.description || '',
    });
  };

  const setField = (key, value) => setEditor((current) => (current ? { ...current, [key]: value } : current));

  const pickRoute = (route) => {
    // A page that already has an entry is edited rather than duplicated
    const row = rowByRoute.get(route);
    if (row?.entry) openFor(row);
    else setField('route', route);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setErrors({});
    const payload = { title: editor.title.trim(), description: editor.description.trim() };
    try {
      if (editor.id) await api.put(`/seo/admin/${editor.id}`, payload);
      else await api.post('/seo/admin', { route: editor.route, ...payload });
      toast.success('SEO saved. The website updates within a minute.');
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

  const reset = async () => {
    if (!pendingReset?.entry) return;
    try {
      await api.delete(`/seo/admin/${pendingReset.entry._id}`);
      toast.success('Page reset to its default SEO');
      setPendingReset(null);
      if (editor?.id === pendingReset.entry._id) setEditor(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reset');
    }
  };

  const customCount = entries.length;
  const editorRow = editor ? rowByRoute.get(editor.route) : null;
  const previewTitle = editor ? editor.title.trim() || editorRow?.defaultTitle || '' : '';
  const previewDescription = editor ? editor.description.trim() || editorRow?.defaultDescription || '' : '';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <SearchCheck className="w-6 h-6 text-ame-orange" /> SEO
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Page titles and meta descriptions on iiae.in. Pages without custom SEO use their defaults. Changes appear on the website within a minute.
          </p>
        </div>
        <button type="button" onClick={() => openFor(null)} className="btn-primary flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4.5 h-4.5" /> New SEO entry
        </button>
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
            placeholder="Search by page, path or title…"
            className="input-field pl-10"
            aria-label="Search pages"
          />
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold">
          {[
            ['all', `All pages (${rows.length})`],
            ['custom', `Custom (${customCount})`],
            ['default', `Default (${rows.length - customCount})`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer ${filter === value ? 'bg-ame-navy text-white border-ame-navy' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
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
        <div className="glass-card py-16 text-center text-slate-500 font-semibold">No pages match this search</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Title shown</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell w-24">SEO</th>
                <th className="px-4 py-3 font-semibold text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.route} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 truncate max-w-xs">{row.label}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{row.route}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                    <p className="line-clamp-1">{row.entry?.title || row.defaultTitle || '—'}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{row.entry?.description || row.defaultDescription || ''}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex text-[11px] font-semibold px-2 py-1 rounded-full ${row.entry ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {row.entry ? 'Custom' : 'Default'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`${WEBSITE_URL}${row.route}`} target="_blank" rel="noreferrer" aria-label={`Open ${row.route} on the website`} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button type="button" onClick={() => openFor(row)} aria-label={`Edit SEO of ${row.route}`} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {row.entry && (
                        <button type="button" onClick={() => setPendingReset(row)} aria-label={`Reset SEO of ${row.route}`} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={editor.id ? 'Edit SEO' : 'New SEO entry'}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !saving && setEditor(null)} />
          <form onSubmit={save} className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editor.id ? 'Edit SEO' : 'New SEO entry'}</h2>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <Field label="Page" error={errors.route}>
              {editor.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">{editorRow?.label || editor.route}</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate">{editor.route}</span>
                </div>
              ) : (
                <select className={inputClass} value={editor.route} onChange={(e) => pickRoute(e.target.value)} required aria-label="Page">
                  <option value="">Choose a page…</option>
                  {pickerGroups.map(([group, pages]) => (
                    <optgroup key={group} label={group}>
                      {pages.map((page) => (
                        <option key={page.route} value={page.route}>{`${page.label} (${page.route})`}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </Field>

            <Field
              label="Title"
              error={errors.title}
              hint={editorRow?.defaultTitle ? 'Leave blank to keep the default shown in grey.' : 'Shown in the browser tab and as the headline in search results.'}
            >
              <input
                className={inputClass}
                value={editor.title}
                onChange={(e) => setField('title', e.target.value)}
                maxLength={TITLE_MAX}
                placeholder={editorRow?.defaultTitle || 'Page title'}
              />
              <div className="flex justify-end mt-1"><Counter value={editor.title.trim()} ideal={TITLE_IDEAL} /></div>
            </Field>

            <Field
              label="Meta description"
              error={errors.description}
              hint={editorRow?.defaultDescription ? 'Leave blank to keep the default shown in grey.' : 'The summary under the title in search results.'}
            >
              <textarea
                className={`${inputClass} min-h-28`}
                value={editor.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={DESCRIPTION_MAX}
                placeholder={editorRow?.defaultDescription || 'One or two sentences about the page'}
              />
              <div className="flex justify-end mt-1"><Counter value={editor.description.trim()} ideal={DESCRIPTION_IDEAL} /></div>
            </Field>

            {editor.route && (
              <div className="rounded-lg border border-slate-200 p-4 space-y-1" aria-label="Search result preview">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Search result preview</p>
                <p className="text-[12px] text-slate-600 truncate">{WEBSITE_URL.replace(/^https?:\/\//, '')}{editor.route === '/' ? '' : editor.route}</p>
                <p className="text-[17px] leading-snug text-[#1a0dab] line-clamp-1">{previewTitle || '—'}</p>
                <p className="text-[13px] text-slate-600 line-clamp-2">{previewDescription || '—'}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {editor.id && (
                  <button type="button" onClick={() => setPendingReset(editorRow)} className="text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer">
                    Reset to default
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditor(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !editor.route} className="btn-primary disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingReset)}
        title="Reset to default SEO?"
        message={pendingReset ? `${pendingReset.route} will go back to its default title and description.` : ''}
        confirmLabel="Reset"
        onConfirm={reset}
        onCancel={() => setPendingReset(null)}
      />
    </div>
  );
}
