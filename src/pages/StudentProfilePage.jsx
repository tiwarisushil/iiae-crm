import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import StudentProfileForm from './StudentProfileForm';
import PayuPayButton from '../components/PayuPayButton';

const EDUCATION = [
  { key: 'classXII', title: 'Class XII', board: 'Board', school: 'School', stream: 'Stream' },
];

const fileHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const text = (value) => String(value ?? '').trim();

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const rupee = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const hasRecord = (record) => {
  if (!record) return false;
  return Boolean(
    String(record.board || '').trim()
    || String(record.passingYear || '').trim()
    || String(record.school || '').trim()
    || String(record.stream || '').trim()
    || Number(record.percentage)
    || Number(record.cgpa)
    || Number(record.marksObtained)
  );
};

const Cell = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{children || '—'}</div>
  </div>
);

const Panel = ({ title, children, className = '' }) => (
  <section className={`glass-card ${className}`}>
    <h2 className="student-panel-head">{title}</h2>
    <div className="px-4 py-4">{children}</div>
  </section>
);

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingForm, setOpeningForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadProfile = async () => {
    const response = await api.get('/dashboard');
    setData(response.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadProfile();
      } catch (error) {
        toast.error('Could not load your profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-iiae-gold border-t-transparent" />
      </div>
    );
  }

  const registration = data?.registration || {};
  const pending = Boolean(data?.registrationPending);
  const photo = fileHref(registration.photoUrl);
  const signature = fileHref(registration.signatureUrl);
  const education = EDUCATION.filter((item) => hasRecord(registration.academics?.[item.key]));
  const extraAnswers = (registration.extraAnswers || []).filter((item) => String(item?.label || item?.value || '').trim());

  const displayName = text(registration.name) || 'Student';
  const summary = data?.profile || {};
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const addressLine = [registration.address, registration.city, registration.state, registration.pin, registration.country].map(text).filter(Boolean).join(', ');
  const feeDue = !pending && !registration.registrationFeePaid && Number(registration.registrationFeeAmount) > 0;

  if (editing) {
    return (
      <StudentProfileForm
        registration={registration}
        pending={pending}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          await loadProfile();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="glass-card flex shrink-0 flex-wrap items-center gap-4 px-4 py-3">
        {photo ? (
          <img src={photo} alt={displayName} className="h-16 w-14 shrink-0 border border-slate-200 object-cover" />
        ) : (
          <span className="grid h-16 w-14 shrink-0 place-items-center bg-iiae-gold text-lg font-semibold text-white">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student</p>
          <h1 className="truncate text-lg font-semibold text-slate-900">{displayName}</h1>
          <p className="truncate text-xs text-slate-500">
            {[text(registration.email), text(registration.phone)].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            pending
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : feeDue
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pending || feeDue ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {pending ? 'Registration incomplete' : feeDue ? 'Fee unpaid' : 'Registered'}
          </span>
          {!pending && (
            <span className="hidden font-mono text-xs font-semibold text-slate-600 sm:inline">
              {text(registration.studentId) || 'ID pending'}
            </span>
          )}
          <button type="button" onClick={() => setEditing(true)} className="btn-outline">
            Edit profile
          </button>
        </div>
      </header>

      {pending && (
        <section className="glass-card px-6 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Action needed</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Finish your registration</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            The exam application is still open. Complete the registration form to receive your ID and continue.
          </p>
          <button
            type="button"
            onClick={completeRegistration}
            disabled={openingForm}
            className="btn-primary mt-5 w-fit disabled:opacity-60"
          >
            {openingForm ? 'Opening...' : 'Fill registration form'}
          </button>
        </section>
      )}

      {!pending && (
        <>
          {feeDue && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{rupee.format(registration.registrationFeeAmount)}</span>
                {' '}registration fee is due.
                <Link to="/dashboard/student/payments" className="ml-2 font-semibold text-iiae-gold hover:underline">All payments</Link>
              </p>
              <PayuPayButton payableType="registration_fee" label="Pay registration fee" className="btn-primary" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Panel title="Personal details" className="lg:col-span-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <Cell label="Registration ID">{text(registration.studentId) || 'Pending allocation'}</Cell>
                <Cell label="Registered">{registration.formSubmittedAt ? formatDate(registration.formSubmittedAt) : 'Not registered yet'}</Cell>
                <Cell label="Gender">{text(registration.gender)}</Cell>
                <Cell label="Date of birth">{registration.dob ? formatDate(registration.dob) : ''}</Cell>
                <Cell label="Category">{text(registration.category)}</Cell>
                <Cell label="Alternative phone">{text(registration.alternatePhone)}</Cell>
                <Cell label="Father's name">{text(registration.fatherName)}</Cell>
                <Cell label="Mother's name">{text(registration.motherName)}</Cell>
                <Cell label="Parent mobile">{text(registration.parentMobile)}</Cell>
                <Cell label="Parent email">{text(registration.parentEmail)}</Cell>
                <div className="sm:col-span-2">
                  <Cell label="Address">{addressLine}</Cell>
                </div>
              </div>
            </Panel>

            <Panel title="Academics" className="lg:col-span-2">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Cell label="Course">{text(registration.courseName) || text(summary.courseName)}</Cell>
                  <Cell label="Qualification">{text(registration.qualification) || '12th'}</Cell>
                  <Cell label="Registration fee">{registration.registrationFeeAmount ? rupee.format(registration.registrationFeeAmount) : ''}</Cell>
                  <Cell label="Fee status">{registration.registrationFeePaid ? 'Paid' : 'Unpaid'}</Cell>
                  {text(registration.examCentreFirst) && <Cell label="Exam centre 1">{text(registration.examCentreFirst)}</Cell>}
                  {text(registration.examCentreSecond) && <Cell label="Exam centre 2">{text(registration.examCentreSecond)}</Cell>}
                  {fileHref(registration.acknowledgementUrl) && (
                    <Cell label="Acknowledgement">
                      <a href={fileHref(registration.acknowledgementUrl)} target="_blank" rel="noreferrer" className="text-iiae-gold underline">Download PDF</a>
                    </Cell>
                  )}
                </div>

                {education.map((item) => {
                  const record = registration.academics[item.key] || {};
                  const score = record.scoreType === 'cgpa'
                    ? (Number(record.cgpa) ? `${record.cgpa} CGPA` : '')
                    : (Number(record.percentage) ? `${record.percentage}%` : '');
                  return (
                    <div key={item.key} className="border-t border-slate-100 pt-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <Cell label={item.board}>{text(record.board)}</Cell>
                        <Cell label="Passing year">{text(record.passingYear)}</Cell>
                        <Cell label={item.school}>{text(record.school)}</Cell>
                        {item.stream && <Cell label={item.stream}>{text(record.stream)}</Cell>}
                        {score && <Cell label="Result">{score}</Cell>}
                        {record.scoreType !== 'cgpa' && Number(record.marksObtained) > 0 && (
                          <Cell label="Marks">{`${record.marksObtained} / ${record.maximumMarks || '—'}`}</Cell>
                        )}
                      </div>
                    </div>
                  );
                })}

                {signature && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signature</p>
                    <img src={signature} alt="Student signature" className="mt-2 h-16 w-40 border border-slate-200 bg-slate-50 object-contain p-2" />
                  </div>
                )}

                {extraAnswers.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold text-slate-900">Additional details</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {extraAnswers.map((item) => {
                        const href = fileHref(item.value);
                        return (
                          <Cell key={item.fieldId || item.label} label={item.label || 'Answer'}>
                            {href ? <a href={href} target="_blank" rel="noreferrer" className="text-iiae-gold underline">View file</a> : text(item.value)}
                          </Cell>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(registration.documents || []).length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold text-slate-900">Documents</p>
                    <ul className="mt-2 space-y-1.5">
                      {registration.documents.map((document) => {
                        const href = fileHref(document.url);
                        return (
                          <li key={document.name} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-slate-800">{document.name}</span>
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-iiae-gold hover:underline">View</a>
                            ) : (
                              <span className="text-xs text-slate-500">On file</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentProfilePage;
