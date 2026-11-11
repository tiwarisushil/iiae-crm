import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Upload, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import UploadLeadsButton from '../components/UploadLeadsButton';

const UploadedLeadsPage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leads', { params: { source: 'upload' } });
      setLeads(response.data);
    } catch (error) {
      toast.error('Could not load uploaded leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const visible = leads.filter((lead) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [lead.name, lead.email, lead.phone, lead.address, lead.qualification]
      .some((value) => String(value || '').toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" /> Uploaded leads
          </h2>
          <p className="text-xs text-slate-500 mt-1">Leads added from an Excel or CSV file.</p>
        </div>
        {user?.role === 'admin' && <UploadLeadsButton onUploaded={fetchLeads} />}
      </div>

      <div className="p-4">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, phone, email or address..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Lead</th>
                  <th className="p-4">Qualification</th>
                  <th className="p-4">Address</th>
                  <th className="p-4">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {visible.length > 0 ? visible.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 leading-tight capitalize">{lead.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {lead.phone}{lead.email ? ` | ${lead.email}` : ''}
                      </p>
                    </td>
                    <td className="p-4 font-semibold">{lead.qualification || '—'}</td>
                    <td className="p-4 font-semibold">{lead.address || '—'}</td>
                    <td className="p-4 font-semibold text-slate-500">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-semibold">
                      No uploaded leads yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadedLeadsPage;
