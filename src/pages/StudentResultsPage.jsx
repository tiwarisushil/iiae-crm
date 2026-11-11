import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentResultsPage = () => {
  const [exams, setExams] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, settingsRes] = await Promise.all([
        api.get('/exams').catch(() => null),
        api.get('/settings').catch(() => null)
      ]);
      if (examsRes) setExams(examsRes.data);
      if (settingsRes) setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Failed to load academic records');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-iiae-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (settings && !settings.resultEnabled) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Exam results</h2>
          <p className="mt-0.5 text-xs text-slate-500">Entrance exam scores and result status.</p>
        </div>
        <div className="glass-card flex flex-col items-start gap-2 px-5 py-8">
          <HelpCircle className="h-6 w-6 text-iiae-gold" />
          <h3 className="text-base font-semibold text-slate-900">Results are not published yet</h3>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            Entrance examination results are currently pending publication by the IIAE Administration. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Filter exams that have results for this student
  const examCards = exams.filter(e => e.myResult !== undefined && e.myResult !== null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Exam results</h2>
        <p className="mt-0.5 text-xs text-slate-500">Entrance exam scores and result status.</p>
      </div>

      {examCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {examCards.map((exam) => {
            const res = exam.myResult;
            const percentage = exam.maxMarks ? ((res.marksObtained / exam.maxMarks) * 100).toFixed(1) : '0.0';
            const isPassed = res.status === 'passed';

            return (
              <article key={exam._id} className="glass-card flex flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-accent-gold px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-iiae-gold">
                    {exam.type} test
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {new Date(exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{exam.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Maximum marks {exam.maxMarks}</p>
                </div>
                <div className="mt-auto flex items-center gap-4 border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="shrink-0 border border-slate-200 bg-white px-3 py-2 text-center">
                    <p className="text-lg font-semibold tabular-nums leading-none text-slate-900">{res.marksObtained}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Obtained</p>
                  </div>
                  <div className="min-w-0">
                    {isPassed ? (
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5" /> Passed · {percentage}%
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                        <XCircle className="h-3.5 w-3.5" /> Not passed · {percentage}%
                      </p>
                    )}
                    {res.remarks && <p className="mt-1 text-xs text-slate-500">{res.remarks}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-card px-5 py-10 text-sm text-slate-500">
          No results have been published on your profile yet.
        </div>
      )}
    </div>
  );
};

export default StudentResultsPage;
