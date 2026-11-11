import React, { useState } from 'react';
import api from '../utils/api';
import { Upload, Download, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UploadLeadsButton = ({ onUploaded, className = '', plain = false, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [sampleDownloaded, setSampleDownloaded] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProblems, setImportProblems] = useState([]);
  const [importing, setImporting] = useState(false);

  const openImport = () => {
    setSampleDownloaded(false);
    setImportFile(null);
    setImportProblems([]);
    setOpen(true);
    onOpen?.();
  };

  const downloadSample = async () => {
    try {
      const response = await api.get('/leads/import/sample', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads-sample.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      setSampleDownloaded(true);
    } catch (error) {
      toast.error('Could not download the sample file');
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    if (!importFile) return;
    const payload = new FormData();
    payload.append('file', importFile);
    setImporting(true);
    setImportProblems([]);
    try {
      const response = await api.post('/leads/import', payload, {
        transformRequest: [(body, headers) => {
          delete headers['Content-Type'];
          return body;
        }],
      });
      const problems = response.data.problems || [];
      setImportProblems(problems);
      if (response.data.created > 0) {
        toast.success(response.data.message);
        setImportFile(null);
        if (onUploaded) onUploaded();
      }
      if (!problems.length) setOpen(false);
      else if (!response.data.created) toast.error(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not import the leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={openImport} className={`${plain ? 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50' : 'btn-outline flex items-center gap-1.5'} ${className}`}>
        <Upload className="w-4 h-4" /> Upload leads
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" /> Upload leads
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-800">1. Download the sample</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  The file has five columns: Name, Email, Phone, Qualification and Address. Replace the example row with your leads. Qualification can be 10th, 12th, Diploma, ITI, Graduate or Post Graduate. You can upload the filled Excel file, or a CSV file with the same column names.
                </p>
                <button type="button" onClick={downloadSample} className="btn-outline px-3 py-2 text-xs">
                  <Download className="w-4 h-4" /> Download sample
                </button>
              </div>
              <div className={`rounded-xl border p-4 space-y-3 ${sampleDownloaded ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <p className="text-xs font-bold text-slate-800">2. Upload the filled Excel or CSV file</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={!sampleDownloaded || importing}
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700"
                />
                {!sampleDownloaded && (
                  <p className="text-[11px] text-slate-500 font-semibold">Download the sample before choosing a file.</p>
                )}
              </div>
              {importProblems.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1 max-h-32 overflow-y-auto">
                  {importProblems.map((problem) => (
                    <p key={`${problem.row}-${problem.message}`} className="text-[11px] font-semibold text-rose-700">
                      Row {problem.row}: {problem.message}
                    </p>
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={!sampleDownloaded || !importFile || importing}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Upload leads'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadLeadsButton;
