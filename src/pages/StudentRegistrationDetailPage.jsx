import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const fileHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const show = (value) => {
  const text = String(value ?? '').trim();
  return text || '—';
};

const ACADEMICS = [
  ['classX', 'Class X'],
  ['classXII', 'Class XII'],
  ['diploma', 'Diploma'],
  ['iti', 'ITI'],
  ['graduation', 'Graduation'],
  ['postGraduation', 'Post graduation'],
];

const hasRecord = (record) => Boolean(
  record && (
    String(record.board || record.school || record.stream || record.passingYear || '').trim()
    || Number(record.percentage)
    || Number(record.cgpa)
    || Number(record.marksObtained)
  )
);

const isImage = (value) => /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(String(value || ''));

const Preview = ({ src, alt }) => (
  <img src={src} alt={alt} className="mt-1 max-h-40 rounded-lg border border-slate-200 bg-white object-contain" />
);

const Cell = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{children || '—'}</div>
  </div>
);

const Panel = ({ title, children }) => (
  <section className="glass-card">
    <h2 className="border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ame-orange">{title}</h2>
    <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);

const StudentRegistrationDetailPage = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/users/${id}`);
        setStudent(response.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not load this student');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ame-orange border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-sm text-slate-500">Student not found.</p>;
  }

  const profile = student.profile || {};
  const paid = Boolean(profile.registrationFeePaid);
  const backTo = paid ? '/dashboard/registrations/paid' : '/dashboard/registrations/unpaid';
  const photo = fileHref(profile.photoUrl);
  const signature = fileHref(profile.signatureUrl);
  const acknowledgement = fileHref(profile.acknowledgementUrl);
  const records = ACADEMICS
    .map(([key, title]) => ({ title, record: profile.academics?.[key] }))
    .filter(({ record }) => hasRecord(record));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold capitalize text-slate-900">
            <ClipboardList className="h-5 w-5 text-ame-orange" /> {student.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{profile.studentId || 'Roll number not generated'} · {student.email}</p>
        </div>
        <Link to={backTo} className="btn-outline flex items-center gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Registrations
        </Link>
      </div>

      <Panel title="Account">
        <Cell label="Phone">{show(student.phone)}</Cell>
        <Cell label="Status">{show(student.status)}</Cell>
        <Cell label="Registered">{formatDate(profile.formSubmittedAt || student.createdAt)}</Cell>
        <Cell label="Payment">{paid ? `Paid ${formatDate(profile.registrationPaidAt)}` : 'Unpaid'}</Cell>
        <Cell label="Fee">{profile.registrationFeeAmount ? `₹${Number(profile.registrationFeeAmount).toLocaleString('en-IN')}` : '—'}</Cell>
        <Cell label="Registered by">{show(profile.registeredBy?.name)}</Cell>
        <Cell label="Course">{show(profile.course?.name)}</Cell>
        <Cell label="Batch">{show(profile.batch?.name)}</Cell>
        <Cell label="Entrance">{show(profile.entranceStatus)}</Cell>
      </Panel>

      <Panel title="Personal">
        <Cell label="Date of birth">{formatDate(profile.dob)}</Cell>
        <Cell label="Gender">{show(profile.gender)}</Cell>
        <Cell label="Father">{show(profile.fatherName)}</Cell>
        <Cell label="Mother">{show(profile.motherName)}</Cell>
        <Cell label="Category">{show(profile.category)}</Cell>
        <Cell label="Qualification">{show(profile.qualification)}</Cell>
        <Cell label="Parent mobile">{show(profile.parentMobile)}</Cell>
        <Cell label="Parent email">{show(profile.parentEmail)}</Cell>
        <Cell label="Address">{show([profile.address, profile.city, profile.state, profile.pin, profile.country].filter(Boolean).join(', '))}</Cell>
        <Cell label="Exam centre 1">{show(profile.examCentreFirst)}</Cell>
        <Cell label="Exam centre 2">{show(profile.examCentreSecond)}</Cell>
      </Panel>

      {(photo || signature || acknowledgement) && (
        <Panel title="Files">
          {photo && <Cell label="Photo"><Preview src={photo} alt="Photo" /></Cell>}
          {signature && <Cell label="Signature"><Preview src={signature} alt="Signature" /></Cell>}
          {acknowledgement && (
            <Cell label="Acknowledgement">
              <iframe title="Acknowledgement" src={acknowledgement} className="mt-1 h-64 w-full rounded-lg border border-slate-200 bg-white" />
            </Cell>
          )}
          {(profile.documents || []).map((document) => {
            const src = fileHref(document.url) || document.url;
            return (
              <Cell key={document.url} label={document.name}>
                {isImage(src) ? <Preview src={src} alt={document.name} /> : <iframe title={document.name} src={src} className="mt-1 h-64 w-full rounded-lg border border-slate-200 bg-white" />}
              </Cell>
            );
          })}
        </Panel>
      )}

      {records.length > 0 && (
        <section className="glass-card">
          <h2 className="border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ame-orange">Education</h2>
          <div className="divide-y divide-slate-100">
            {records.map(({ title, record }) => (
              <div key={title} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                <Cell label={title}>{show(record.board || record.school)}</Cell>
                <Cell label="School">{show(record.school)}</Cell>
                <Cell label="Year">{show(record.passingYear)}</Cell>
                <Cell label="Score">
                  {record.scoreType === 'cgpa' && record.cgpa
                    ? `${record.cgpa} CGPA`
                    : record.percentage
                      ? `${record.percentage}%`
                      : record.marksObtained
                        ? `${record.marksObtained}${record.maximumMarks ? ` / ${record.maximumMarks}` : ''}`
                        : '—'}
                </Cell>
              </div>
            ))}
          </div>
        </section>
      )}

      {(profile.extraAnswers || []).length > 0 && (
        <Panel title="Other answers">
          {profile.extraAnswers.map((answer) => {
            const href = fileHref(answer.value);
            return (
              <Cell key={answer.fieldId || answer.label} label={answer.label || 'Answer'}>
                {href && isImage(href) ? <Preview src={href} alt={answer.label || 'Answer'} /> : href ? <iframe title={answer.label || 'Answer'} src={href} className="mt-1 h-64 w-full rounded-lg border border-slate-200 bg-white" /> : show(answer.value)}
              </Cell>
            );
          })}
        </Panel>
      )}
    </div>
  );
};

export default StudentRegistrationDetailPage;
