import React, { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const ExportAllLeadsButton = ({ className = '', plain = false, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const download = async (format) => {
    setOpen(false);
    onOpen?.();
    setExporting(true);
    try {
      const response = await api.get(`/leads/export?format=${format}`, { responseType: 'blob' });
      const stamp = new Date().toISOString().slice(0, 10);
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      triggerDownload(response.data, `iiae-leads-${stamp}.${extension}`);
      toast.success('Leads exported');
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const payload = JSON.parse(text);
          toast.error(payload.message || 'Could not export leads');
          return;
        } catch {
          // fall through
        }
      }
      toast.error(error.response?.data?.message || 'Could not export leads');
    } finally {
      setExporting(false);
    }
  };

  const baseClass = plain
    ? 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60'
    : 'btn-outline flex items-center gap-1.5 disabled:opacity-60';

  return (
    <div className={`relative ${plain ? '' : className}`} ref={menuRef}>
      <button
        type="button"
        disabled={exporting}
        onClick={() => setOpen((value) => !value)}
        className={`${baseClass} ${plain ? className : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className="w-4 h-4" />
        {exporting ? 'Exporting…' : 'Export all leads'}
        {!plain && <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
            plain ? 'left-0 right-0' : 'right-0 min-w-[168px]'
          }`}
          role="menu"
        >
          <button type="button" role="menuitem" onClick={() => download('xlsx')} className="flex w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50">
            Excel (.xlsx)
          </button>
          <button type="button" role="menuitem" onClick={() => download('csv')} className="flex w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50">
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportAllLeadsButton;
