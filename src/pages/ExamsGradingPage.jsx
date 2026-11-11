import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ClipboardList, Plus, Search, Edit3, X, Award, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ExamsGradingPage = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'entrance',
    maxMarks: 100,
    date: new Date().toISOString().split('T')[0],
  });

  // Grading list state
  const [gradingRows, setGradingRows] = useState([]);

  useEffect(() => {
    fetchExams();
    fetchStudents();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exams');
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to load exam listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data);
    } catch (e) {}
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams', formData);
      toast.success('Exam entry registered successfully');
      setIsCreateOpen(false);
      setFormData({
        name: '',
        type: 'entrance',
        maxMarks: 100,
        date: new Date().toISOString().split('T')[0],
      });
      fetchExams();
    } catch (error) {
      toast.error('Failed to register exam');
    }
  };

  const handleGradingClick = (exam) => {
    setSelectedExam(exam);
    
    // Build initial rows for grading.
    // If it's an entrance exam, list all student users who are in 'pending' or 'admit_card_generated' or 'appeared' state.
    // Otherwise, list students mapped in the results array, or fetch appropriate batch students.
    let eligibleStudents = [...students];
    if (exam.type === 'entrance') {
      eligibleStudents = students.filter(s => 
        s.profile?.entranceStatus === 'pending' || 
        s.profile?.entranceStatus === 'admit_card_generated' ||
        s.profile?.entranceStatus === 'appeared' ||
        s.profile?.entranceStatus === 'passed' ||
        s.profile?.entranceStatus === 'failed'
      );
    }

    const rows = eligibleStudents.map((s) => {
      const existingRes = exam.results?.find((r) => (r.student?._id || r.student) === s._id);
      return {
        studentId: s._id,
        name: s.name,
        rollNumber: s.profile?.studentId || 'Candidate',
        marksObtained: existingRes ? existingRes.marksObtained : 0,
        status: existingRes ? existingRes.status : 'pending',
        remarks: existingRes ? existingRes.remarks : '',
      };
    });

    setGradingRows(rows);
    setIsGradingOpen(true);
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...gradingRows];
    updatedRows[index][field] = value;
    
    // Auto-status setter based on marks: e.g., if marks >= 40, status is passed, else failed
    if (field === 'marksObtained') {
      const marks = Number(value);
      if (marks >= (selectedExam.maxMarks * 0.4)) {
        updatedRows[index]['status'] = 'passed';
      } else {
        updatedRows[index]['status'] = 'failed';
      }
    }

    setGradingRows(updatedRows);
  };

  const handleGradingSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/exams/${selectedExam._id}/results`, {
        results: gradingRows.map((r) => ({
          studentId: r.studentId,
          marksObtained: r.marksObtained,
          status: r.status,
          remarks: r.remarks,
        })),
      });
      toast.success('Exam grading saved successfully');
      setIsGradingOpen(false);
      fetchExams();
    } catch (error) {
      toast.error('Failed to save exam results');
    }
  };

  const filteredExams = exams.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500" /> Exams & Grading
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure test entries, print admit cards, and grade academic marks.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4.5 h-4.5" /> Register Test Module
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
            placeholder="Search by exam name..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Exams list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Exam Module</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4 text-center">Max Marks</th>
                  <th className="p-4 text-center">Graded roster</th>
                  <th className="p-4 text-center font-semibold">Grade action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExams.length > 0 ? (
                  filteredExams.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{e.name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-bold ${
                          e.type === 'entrance' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {e.type}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-500">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800">{e.maxMarks}</td>
                      <td className="p-4 text-center font-bold text-slate-500">
                        {e.results?.length || 0} Graded
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleGradingClick(e)}
                          className="px-2.5 py-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-md font-bold text-[11px] uppercase flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" /> Grade Results
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">No exam modules registered</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" /> Define Exam Module
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Exam Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. IIAE Entrance Exam Aug 2026"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Exam Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="entrance">Entrance Examination</option>
                  <option value="midterm">Midterm Examination</option>
                  <option value="final">Final Examination</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                    placeholder="e.g. 100"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date Scheduled</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-field"
                  />
                </div>
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
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADING SCREEN MODAL */}
      {isGradingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Enter Scores: {selectedExam?.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Exam Type: {selectedExam?.type.toUpperCase()} | Maximum Marks: {selectedExam?.maxMarks}
                </p>
              </div>
              <button onClick={() => setIsGradingOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGradingSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {gradingRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                          <th className="p-3">Candidate / Roll</th>
                          <th className="p-3 text-center">Marks Obtained</th>
                          <th className="p-3">Pass / Fail status</th>
                          <th className="p-3">Remarks / Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {gradingRows.map((row, idx) => (
                          <tr key={row.studentId}>
                            <td className="p-3">
                              <p className="font-bold text-slate-900 leading-tight capitalize">{row.name}</p>
                              <p className="text-[11px] font-mono text-slate-500 mt-0.5">{row.rollNumber}</p>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={selectedExam?.maxMarks}
                                required
                                value={row.marksObtained}
                                onChange={(e) => handleRowChange(idx, 'marksObtained', e.target.value)}
                                className="w-20 text-center input-field py-1 px-2 mx-auto font-mono font-bold"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={row.status}
                                onChange={(e) => handleRowChange(idx, 'status', e.target.value)}
                                className="input-field py-1"
                              >
                                <option value="pending">Pending</option>
                                <option value="passed">Passed</option>
                                <option value="failed">Failed</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={row.remarks}
                                onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                                placeholder="Enter feedback remark"
                                className="input-field py-1.5"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 font-semibold">No students are currently eligible for this exam category</div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGradingOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Roster Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsGradingPage;
