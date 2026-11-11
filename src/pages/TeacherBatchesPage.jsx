import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { GraduationCap, Users, Calendar, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TeacherBatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherBatches();
  }, []);

  const fetchTeacherBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/batches');
      setBatches(response.data);
    } catch (error) {
      toast.error('Failed to load class batches');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchClick = async (batch) => {
    setSelectedBatch(batch);
    setStudents(batch.students || []);
  };

  const handleBackClick = () => {
    setSelectedBatch(null);
    setStudents([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      {!selectedBatch ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-500" /> My Batches
          </h2>
          <p className="text-xs text-slate-500 mt-1">Select an assigned batch to view the roster list.</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-2 hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{selectedBatch.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Program: {selectedBatch.course?.name} | Timings: {selectedBatch.schedule}
            </p>
          </div>
        </div>
      )}

      {/* Grid of Batches */}
      {!selectedBatch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.length > 0 ? (
            batches.map((b) => (
              <div
                key={b._id}
                onClick={() => handleBatchClick(b)}
                className="glass-card p-5 flex flex-col justify-between transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  <span className="font-mono text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">
                    {b.course?.code || 'COHORT'}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-all text-sm leading-snug">
                      {b.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {b.schedule || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-3 text-[11px] font-bold text-slate-500 uppercase">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-500" /> {b.students?.length || 0} Enrolled
                  </span>
                  <span className="text-amber-500 group-hover:translate-x-1 transition-all">Inspect Roster &rarr;</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-500 font-semibold">
              No batches are currently assigned to you.
            </div>
          )}
        </div>
      ) : (
        /* Roster listing */
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 shrink-0 text-slate-500 font-semibold text-[11px] uppercase tracking-wide">
            Cohort Student Roster ({students.length} Total)
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Student Details</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Residential Address</th>
                  <th className="p-4 text-center">Admission Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.length > 0 ? (
                  students.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {s.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight capitalize">{s.name}</p>
                            {s.profile?.studentId && (
                              <p className="text-[11px] font-mono text-amber-600 font-bold mt-0.5">
                                ID: {s.profile.studentId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" /> {s.email}
                        </p>
                        <p className="text-slate-500 font-semibold mt-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" /> {s.phone}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{s.profile?.address || 'N/A'}</span>
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase font-bold ${
                          s.profile?.entranceStatus === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {s.profile?.entranceStatus || 'enrolled'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-semibold">No students are currently mapped to this cohort</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherBatchesPage;
