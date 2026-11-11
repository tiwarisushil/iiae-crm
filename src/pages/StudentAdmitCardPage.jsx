import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Printer, Plane, HelpCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentAdmitCardPage = () => {
  const [admitCard, setAdmitCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admitCardRes, settingsRes] = await Promise.all([
        api.get('/exams/admit-card/me').catch(() => null),
        api.get('/settings').catch(() => null)
      ]);
      if (admitCardRes) setAdmitCard(admitCardRes.data);
      if (settingsRes) setSettings(settingsRes.data);
    } catch (error) {
      console.log('Error loading admit card details:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('admit-card-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-iiae-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (settings && !settings.admitCardEnabled) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Admit card</h2>
          <p className="mt-0.5 text-xs text-slate-500">Hall ticket for the entrance examination.</p>
        </div>
        <div className="glass-card flex flex-col items-start gap-2 px-5 py-8">
          <HelpCircle className="h-6 w-6 text-iiae-gold" />
          <h3 className="text-base font-semibold text-slate-900">Downloads temporarily disabled</h3>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            Entrance examination admit card downloading is currently deactivated by the IIAE Administration. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Admit card</h2>
          <p className="mt-0.5 text-xs text-slate-500">View or print your hall ticket for the entrance examination.</p>
        </div>
        {admitCard && (
          <button type="button" onClick={handlePrint} className="btn-primary">
            <Printer className="h-4 w-4" /> Print ticket
          </button>
        )}
      </div>

      {admitCard ? (
        <div className="mx-auto max-w-2xl">
          {/* PRINTABLE AREA */}
          <div id="admit-card-print-area" className="bg-white p-8 border-2 border-slate-350 rounded-2xl space-y-6 shadow-sm font-sans text-slate-800">
            {/* Header logo branding */}
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-5">
              <div className="space-y-1">
                <h1 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">IIAE New Delhi</h1>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-none">Indian Institute of Aircraft Engineering</p>
                <p className="text-[11px] text-slate-500 font-semibold leading-none">Approved by DGCA, Ministry of Civil Aviation, Govt. of India</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent-gold border border-iiae-gold/25 flex items-center justify-center text-iiae-gold">
                <Plane className="w-6 h-6 text-iiae-gold rotate-45" />
              </div>
            </div>

            <div className="text-center py-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900 border-b border-slate-100 pb-2">
                ENTRANCE EXAMINATION HALL TICKET
              </h2>
            </div>

            {/* Candidate info grid */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-5">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Candidate Name</p>
                  <p className="font-bold text-slate-900 text-sm">{admitCard.student?.name}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Security Roll Number</p>
                  <p className="font-mono font-bold text-iiae-gold text-sm">{admitCard.rollNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Contact Phone</p>
                  <p className="font-bold text-slate-900">{admitCard.student?.phone}</p>
                </div>
              </div>

              <div className="space-y-3 text-right md:text-left md:pl-10">
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Scheduled Exam Date</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {new Date(admitCard.examDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Reporting Time</p>
                  <p className="font-bold text-slate-900">{admitCard.examTime}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">Exam Center Location</p>
                  <p className="font-bold text-slate-900 leading-snug">{admitCard.examCenter}</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Candidate Instructions
              </h4>
              <p className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed font-semibold">
                {admitCard.instructions}
              </p>
            </div>

            {/* Verification sign-off */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-[11px] font-bold text-slate-300 uppercase">
              <p>Generated: {new Date(admitCard.createdAt).toLocaleDateString()}</p>
              <p className="border-t border-slate-200 pt-1 px-4 mt-6">Controller of Examinations</p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty screen */
        <div className="glass-card flex flex-col items-start gap-2 px-5 py-8">
          <XCircle className="h-6 w-6 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900">No admit card yet</h3>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            Your admit card for the entrance examination has not been generated yet. Please contact the admissions office once your registration is complete.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentAdmitCardPage;
