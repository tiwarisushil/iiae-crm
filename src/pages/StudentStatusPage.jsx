import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plane, CheckCircle2, Circle, ClipboardList, HelpCircle, GraduationCap, IndianRupee, ArrowDownToLine } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentStatusPage = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingForm, setOpeningForm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/dashboard');
      setProfileData(response.data);
    } catch (e) {
      toast.error('Failed to load profile parameters');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setOpeningForm(true);
    try {
      const response = await api.post('/registrations/continue');
      navigate(response.data.registrationPath);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not open the registration form');
    } finally {
      setOpeningForm(false);
    }
  };

  const getStatusNumber = (status) => {
    switch (status) {
      case 'pending': return 1;
      case 'admit_card_generated': return 2;
      case 'appeared': return 3;
      case 'passed':
      case 'failed': return 4;
      default: return 1;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const profile = profileData?.profile;
  const finance = profileData?.finance;
  const currentStep = getStatusNumber(profile?.entranceStatus);

  // Checks for timeline steps
  const steps = [
    {
      title: 'Candidate Registration',
      desc: 'Inquiry details registered in IIAE CRM database.',
      completed: true,
    },
    {
      title: 'Entrance Admit Card',
      desc: profile?.entranceStatus === 'pending'
        ? 'Admit card generation pending scheduling by Management.'
        : 'Admit card published. Ready for download.',
      completed: currentStep >= 2,
      action: profile?.entranceStatus !== 'pending' && (
        <a
          href="/dashboard/student/admit-card"
          className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-2 uppercase"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" /> View Admit Card
        </a>
      ),
    },
    {
      title: 'Aviation Entrance Examination',
      desc: currentStep >= 3
        ? 'Examination attended. Paper sent for marking.'
        : 'Waiting for exam date. Report to center on schedule.',
      completed: currentStep >= 3,
    },
    {
      title: 'Entrance Exam Result',
      desc: profile?.entranceStatus === 'passed'
        ? `PASSED! Score obtained: ${profile.entranceScore} Marks.`
        : profile?.entranceStatus === 'failed'
        ? `FAILED. Score obtained: ${profile.entranceScore} Marks.`
        : 'Result pending review by examinations board.',
      completed: profile?.entranceStatus === 'passed' || profile?.entranceStatus === 'failed',
    },
    {
      title: 'Fee Payment Ledger',
      desc: finance?.paidFee > 0
        ? `Deposit validated. ₹${finance.paidFee.toLocaleString()} received. Net Tuition: ₹${finance.netFee.toLocaleString()}`
        : `Fee allocation verified. Net Tuition: ₹${finance?.netFee?.toLocaleString()}. Pending deposit.`,
      completed: finance?.paidFee > 0,
    },
    {
      title: 'Batch Roster Allocation',
      desc: profile?.batchName !== 'Not Assigned'
        ? `Allocated to ${profile.batchName}. Schedule: ${profile.batchSchedule}. Instructor: ${profile.teacherName}`
        : 'Batch allocation pending fee clearance verification.',
      completed: profile?.batchName !== 'Not Assigned',
    },
  ];

  return (
    <div className="space-y-6">
      {profileData?.registrationPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Complete your registration</p>
            <p className="text-xs text-slate-600 mt-1">Your account is created. Fill the registration form to finish your exam application.</p>
          </div>
          <button
            type="button"
            onClick={completeRegistration}
            disabled={openingForm}
            className="btn-primary shrink-0 disabled:opacity-60"
          >
            {openingForm ? 'Opening...' : 'Complete registration'}
          </button>
        </div>
      )}

      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Plane className="w-6 h-6 text-amber-500 rotate-45 animate-bounce" /> Admission Timeline
        </h2>
        <p className="text-xs text-slate-500 mt-1">Track the enrollment pipeline milestones for your course registration.</p>
      </div>

      {/* Roster & Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Timeline */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admission Progress Checklist</h3>
          
          <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6">
            {steps.map((step, idx) => {
              return (
                <div key={idx} className="relative">
                  {/* Step Icon Indicator */}
                  <span className="absolute -left-[35px] top-0.5 bg-white p-1 rounded-full border border-slate-200">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </span>
                  
                  {/* Step Details */}
                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold ${step.completed ? 'text-slate-900' : 'text-slate-500'}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                    {step.action && step.action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Profile Summary card */}
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Student Parameters</h3>
            <div className="space-y-3 divide-y divide-slate-50 text-xs">
              <div className="pb-2.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Registration Number</p>
                <p className="font-mono font-bold text-slate-900">{profile?.studentId || 'Pending'}</p>
              </div>
              <div className="py-2.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Enrolled Syllabus Program</p>
                <p className="font-bold text-slate-900">{profile?.courseName || 'Unregistered'}</p>
              </div>
              <div className="py-2.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Class Cohort Batch</p>
                <p className="font-bold text-slate-900">{profile?.batchName || 'Unassigned'}</p>
              </div>
              <div className="py-2.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Assigned Instructor</p>
                <p className="font-bold text-slate-900">{profile?.teacherName || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentStatusPage;
