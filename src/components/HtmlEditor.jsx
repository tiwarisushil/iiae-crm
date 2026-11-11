import React, { useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Heading2, Heading3, Pilcrow, List, ListOrdered, Link2, Unlink,
  Image as ImageIcon, Quote, Eraser, Code2, Eye,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// A small rich-text editor for post bodies: a contentEditable "Visual" view with a
// formatting toolbar, and an "HTML" view with the raw markup. The value is always the HTML.
//
//   <HtmlEditor value={html} onChange={setHtml} onUploadImage={async (file) => url} />

const ToolButton = ({ title, onClick, active = false, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    // mousedown (not click) so the editor keeps its selection while the button is pressed
    onMouseDown={(event) => {
      event.preventDefault();
      onClick();
    }}
    className={`p-1.5 rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer ${active ? 'bg-slate-200 text-slate-900' : ''}`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />;

const HtmlEditor = ({ value = '', onChange, onUploadImage, minHeight = 320, disabled = false }) => {
  const [mode, setMode] = useState('visual');
  const [linkDraft, setLinkDraft] = useState(null); // { href } while the link box is open
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);
  // The HTML the editor last reported; lets us tell an outside change (open another post)
  // from our own onChange echo, so the caret is not reset on every keystroke.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (mode !== 'visual' || !editorRef.current) return;
    if (value !== lastEmitted.current || editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      lastEmitted.current = value;
    }
  }, [value, mode]);

  const emit = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
  };

  const exec = (command, argument = null) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const block = (tag) => exec('formatBlock', tag);

  const openLinkBox = () => {
    saveSelection();
    const selection = window.getSelection();
    const anchor = selection?.anchorNode?.parentElement?.closest('a');
    setLinkDraft({ href: anchor?.getAttribute('href') || 'https://' });
  };

  const applyLink = () => {
    const href = (linkDraft?.href || '').trim();
    setLinkDraft(null);
    restoreSelection();
    if (!href || href === 'https://') return;
    if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(href)) {
      toast.error('Links must start with https://, http://, mailto:, tel: or /');
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // Nothing selected: insert the address itself as the link text
      exec('insertHTML', `<a href="${href.replace(/"/g, '&quot;')}">${href.replace(/</g, '&lt;')}</a>`);
    } else {
      exec('createLink', href);
    }
  };

  const insertImage = async (file) => {
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      restoreSelection();
      exec('insertHTML', `<p><img src="${url}" alt="${(file.name || '').replace(/\.[^.]+$/, '').replace(/"/g, '')}" style="max-width:100%;height:auto"></p>`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not upload the image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const switchMode = (next) => {
    if (next === mode) return;
    if (mode === 'visual') emit();
    setMode(next);
  };

  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden bg-white ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        {mode === 'visual' && (
          <>
            <ToolButton title="Bold" onClick={() => exec('bold')}><Bold className="w-4 h-4" /></ToolButton>
            <ToolButton title="Italic" onClick={() => exec('italic')}><Italic className="w-4 h-4" /></ToolButton>
            <ToolButton title="Underline" onClick={() => exec('underline')}><Underline className="w-4 h-4" /></ToolButton>
            <Divider />
            <ToolButton title="Heading 2" onClick={() => block('h2')}><Heading2 className="w-4 h-4" /></ToolButton>
            <ToolButton title="Heading 3" onClick={() => block('h3')}><Heading3 className="w-4 h-4" /></ToolButton>
            <ToolButton title="Paragraph" onClick={() => block('p')}><Pilcrow className="w-4 h-4" /></ToolButton>
            <ToolButton title="Quote" onClick={() => block('blockquote')}><Quote className="w-4 h-4" /></ToolButton>
            <Divider />
            <ToolButton title="Bullet list" onClick={() => exec('insertUnorderedList')}><List className="w-4 h-4" /></ToolButton>
            <ToolButton title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered className="w-4 h-4" /></ToolButton>
            <Divider />
            <ToolButton title="Add link" onClick={openLinkBox} active={Boolean(linkDraft)}><Link2 className="w-4 h-4" /></ToolButton>
            <ToolButton title="Remove link" onClick={() => exec('unlink')}><Unlink className="w-4 h-4" /></ToolButton>
            {onUploadImage && (
              <ToolButton title={uploading ? 'Uploading…' : 'Insert image'} onClick={() => { saveSelection(); fileRef.current?.click(); }}>
                <ImageIcon className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''}`} />
              </ToolButton>
            )}
            <Divider />
            <ToolButton title="Clear formatting" onClick={() => exec('removeFormat')}><Eraser className="w-4 h-4" /></ToolButton>
          </>
        )}
        <div className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => switchMode('visual')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer ${mode === 'visual' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Eye className="w-3.5 h-3.5" /> Visual
          </button>
          <button
            type="button"
            onClick={() => switchMode('html')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer ${mode === 'html' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Code2 className="w-3.5 h-3.5" /> HTML
          </button>
        </div>
      </div>

      {linkDraft && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-amber-50/60">
          <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            autoFocus
            type="text"
            value={linkDraft.href}
            onChange={(event) => setLinkDraft({ href: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); applyLink(); }
              if (event.key === 'Escape') { setLinkDraft(null); restoreSelection(); }
            }}
            placeholder="https://example.com/page"
            className="input-field py-1.5 text-xs flex-1"
          />
          <button type="button" onClick={applyLink} className="btn-primary px-3 py-1.5 text-xs">Apply</button>
          <button type="button" onClick={() => { setLinkDraft(null); restoreSelection(); }} className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">Cancel</button>
        </div>
      )}

      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => { saveSelection(); emit(); }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          data-testid="html-editor-visual"
          className="post-editor px-4 py-3 text-sm text-slate-800 outline-none overflow-y-auto"
          style={{ minHeight, maxHeight: '60vh' }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(event) => { lastEmitted.current = event.target.value; onChange(event.target.value); }}
          spellCheck={false}
          data-testid="html-editor-source"
          className="w-full px-4 py-3 font-mono text-xs text-slate-800 outline-none resize-y"
          style={{ minHeight, maxHeight: '60vh' }}
          placeholder="<p>Write the post as HTML…</p>"
        />
      )}

      {onUploadImage && (
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => insertImage(event.target.files?.[0])}
        />
      )}
    </div>
  );
};

export default HtmlEditor;
