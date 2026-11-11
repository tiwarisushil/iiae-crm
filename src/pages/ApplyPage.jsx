import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LogoImage from '../assets/Logo.png';
import RegistrationFeePayment, { RegistrationPaymentShare } from '../components/RegistrationFeePayment';
import AutocompleteSelect from '../components/AutocompleteSelect';
import { INDIA_STATES, districtsForState } from '../data/indiaStatesDistricts';

const MONTHS = [
  ['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'],
  ['5', 'May'], ['6', 'June'], ['7', 'July'], ['8', 'August'],
  ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];

const blankRecord = () => ({
  board: '',
  passingYear: '',
  school: '',
  stream: '',
  scoreType: 'percentage',
  marksObtained: '',
  maximumMarks: '',
  percentage: '',
  cgpa: '',
});

const calculatedPercentage = (obtained, maximum) => {
  if (obtained === '' || maximum === '') return '';
  const got = Number(obtained);
  const max = Number(maximum);
  if (!Number.isFinite(got) || !Number.isFinite(max) || got < 0 || max <= 0 || got > max) return '';
  return String(Math.round((got / max) * 10000) / 100);
};

const EDUCATION_SECTIONS = {
  classX: {
    title: 'Class X Details',
    board: 'Class X Board',
    boardPlaceholder: 'Board Name',
    school: 'Class X School',
    schoolPlaceholder: 'School name and address',
  },
  classXII: {
    title: 'Class XII Details',
    board: 'Class XII Board',
    boardPlaceholder: 'Board Name',
    school: 'Class XII School',
    schoolPlaceholder: 'School name and address',
    stream: 'Stream',
    streamPlaceholder: 'Science, Commerce or Arts',
  },
  diploma: {
    title: 'Diploma Details',
    board: 'Institute',
    boardPlaceholder: 'Institute name',
    school: 'Institute Address',
    schoolPlaceholder: 'Institute address',
    stream: 'Specialization',
    streamPlaceholder: 'Specialization',
  },
  iti: {
    title: 'ITI Details',
    board: 'Institute',
    boardPlaceholder: 'Institute name',
    school: 'Institute Address',
    schoolPlaceholder: 'Institute address',
    stream: 'Trade',
    streamPlaceholder: 'Trade',
  },
  graduation: {
    title: 'Graduation Details',
    board: 'University',
    boardPlaceholder: 'University name',
    school: 'College',
    schoolPlaceholder: 'College name and address',
    stream: 'Degree',
    streamPlaceholder: 'Degree',
  },
  postGraduation: {
    title: 'Post Graduation Details',
    board: 'University',
    boardPlaceholder: 'University name',
    school: 'College',
    schoolPlaceholder: 'College name and address',
    stream: 'Degree',
    streamPlaceholder: 'Degree',
  },
};

const TWELFTH = 'classXII';
const DIPLOMA = 'diploma';
// The form asks for Class XII and Diploma; the student fills one or both
const EDUCATION_CHOICES = [TWELFTH, DIPLOMA];
const recordStarted = (record) => ['board', 'passingYear', 'school', 'stream', 'marksObtained', 'maximumMarks', 'cgpa']
  .some((key) => String(record?.[key] ?? '').trim() !== '');

const emptyForm = {
  firstName: '',
  lastName: '',
  gender: '',
  dobDay: '',
  dobMonth: '',
  dobYear: '',
  category: '',
  fatherName: '',
  motherName: '',
  mobile: '',
  parentMobile: '',
  email: '',
  parentEmail: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pin: '',
  courseId: '',
  qualification: '',
  academics: {
    classX: blankRecord(),
    classXII: blankRecord(),
    diploma: blankRecord(),
    iti: blankRecord(),
    graduation: blankRecord(),
    postGraduation: blankRecord(),
  },
  examCentreFirst: '',
  examCentreSecond: '',
  extra: {},
};

const control = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

const currentYear = new Date().getFullYear();
const birthYears = Array.from({ length: 57 }, (_, index) => String(currentYear - 15 - index));
const passingYears = Array.from({ length: currentYear - 1970 + 1 }, (_, index) => String(currentYear - index));
const PASSING_YEAR_APPEARING = 'Appearing';
const passingYearOptions = [PASSING_YEAR_APPEARING, ...passingYears];
const isAppearingStudent = (passingYear) => String(passingYear || '').trim().toLowerCase() === PASSING_YEAR_APPEARING.toLowerCase();

const buildDob = (day, month, year) => {
  if (!day || !month || !year) return '';
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
  if (!valid) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const rupee = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const Field = ({ label, required, hint, children }) => (
  <label className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-4">
    <span className="text-sm font-semibold text-slate-800">
      {label} {required && <span className="text-rose-600">*</span>}
      {hint && <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{hint}</span>}
    </span>
    {children}
  </label>
);

const EducationBlock = ({ spec, value, onChange, years, required = true, hint = '' }) => {
  const appearing = isAppearingStudent(value.passingYear);
  return (
  <div className="space-y-4">
    <h3 className="pt-2 text-base font-bold text-slate-900">
      {spec.title}
      {hint && <span className="ml-2 text-xs font-medium text-slate-500">{hint}</span>}
    </h3>
    <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
      <Field label={spec.board} required={required}>
        <input value={value.board} onChange={onChange('board')} placeholder={spec.boardPlaceholder} className={control} />
      </Field>
      <Field label="Passing year / status" required={required} hint={appearing ? 'Select Appearing if you have not received your board results yet.' : ''}>
        <Select value={value.passingYear} onChange={onChange('passingYear')} placeholder="Select year or Appearing">
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </Select>
      </Field>
      <Field label={spec.school} required={required}>
        <textarea rows="2" value={value.school} onChange={onChange('school')} placeholder={spec.schoolPlaceholder} className={`${control} resize-none`} />
      </Field>
      {spec.stream && (
        <Field label={spec.stream} required={required}>
          <input value={value.stream} onChange={onChange('stream')} placeholder={spec.streamPlaceholder} className={control} />
        </Field>
      )}
      {!appearing && (
        <>
          <Field label="Result" hint="Optional">
            <select value={value.scoreType === 'cgpa' ? 'cgpa' : 'percentage'} onChange={onChange('scoreType')} className={control}>
              <option value="percentage">Percentage</option>
              <option value="cgpa">CGPA</option>
            </select>
          </Field>
          {value.scoreType === 'cgpa' ? (
            <Field label="CGPA" hint="Optional, out of 10">
              <input type="number" min="0" max="10" step="0.01" value={value.cgpa} onChange={onChange('cgpa')} placeholder="Not more than 10" className={control} />
            </Field>
          ) : (
            <>
              <Field label="Marks Obtained">
                <input type="number" min="0" step="0.01" value={value.marksObtained} onChange={onChange('marksObtained')} placeholder="Marks obtained" className={control} />
              </Field>
              <Field label="Maximum Marks">
                <input type="number" min="1" step="0.01" value={value.maximumMarks} onChange={onChange('maximumMarks')} placeholder="Maximum marks" className={control} />
              </Field>
              <Field label="Percentage">
                <input readOnly tabIndex={-1} value={value.percentage} placeholder="Auto calculated" className={`${control} bg-slate-50`} />
              </Field>
            </>
          )}
        </>
      )}
    </div>
  </div>
  );
};

const splitDob = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!match) return { dobYear: '', dobMonth: '', dobDay: '' };
  return {
    dobYear: match[1],
    dobMonth: String(Number(match[2])),
    dobDay: String(Number(match[3])),
  };
};

const draftRecord = (record) => {
  if (!record) return blankRecord();
  const year = record.passingYear ? String(record.passingYear) : '';
  if (isAppearingStudent(year)) {
    return {
      board: record.board || '',
      passingYear: PASSING_YEAR_APPEARING,
      school: record.school || '',
      stream: record.stream || '',
      scoreType: 'percentage',
      marksObtained: '',
      maximumMarks: '',
      percentage: '',
      cgpa: '',
    };
  }
  const saved = record.scoreType === 'cgpa' || record.scoreType === 'percentage';
  const scoreType = record.scoreType === 'cgpa' ? 'cgpa' : 'percentage';
  return {
    board: record.board || '',
    passingYear: year,
    school: record.school || '',
    stream: record.stream || '',
    scoreType: saved ? scoreType : 'percentage',
    marksObtained: saved && scoreType === 'percentage' ? String(record.marksObtained ?? '') : '',
    maximumMarks: saved && scoreType === 'percentage' ? String(record.maximumMarks ?? '') : '',
    percentage: saved && scoreType === 'percentage' ? String(record.percentage ?? '') : '',
    cgpa: saved && scoreType === 'cgpa' ? String(record.cgpa ?? '') : '',
  };
};

const uploadHref = (apiBase, url) => {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  const origin = String(apiBase || '').replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
};

const ExtraFields = ({ fields, values, files, savedFiles, onChange, onFile }) => {
  if (!fields.length) return null;
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
      {fields.map((field) => (
        <Field key={field.id} label={field.label} required={field.required}>
          {field.type === 'file' ? (
            <div>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={onFile(field.id)}
                className="text-sm text-slate-600"
              />
              <span className="mt-1 block text-[11px] font-medium text-slate-500">PDF, JPG, PNG, or WEBP. Maximum size 5 MB.</span>
              {files?.[field.id]?.name && <span className="mt-1 block text-xs font-semibold text-slate-700">{files[field.id].name}</span>}
              {!files?.[field.id] && savedFiles?.[field.id] && <span className="mt-1 block text-xs font-semibold text-slate-700">Uploaded</span>}
            </div>
          ) : field.type === 'textarea' ? (
            <textarea rows="3" value={values[field.id] || ''} onChange={onChange(field.id)} className={`${control} resize-none`} />
          ) : field.type === 'yesno' || field.type === 'select' ? (
            <Select value={values[field.id] || ''} onChange={onChange(field.id)} placeholder="Select">
              {(field.type === 'yesno' ? ['Yes', 'No'] : field.options || []).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={values[field.id] || ''}
              onChange={onChange(field.id)}
              className={control}
            />
          )}
        </Field>
      ))}
    </div>
  );
};

const Select = ({ value, onChange, placeholder, children }) => (
  <select value={value} onChange={onChange} className={control}>
    <option value="">{placeholder}</option>
    {children}
  </select>
);

const asked = (windowState, key) => {
  const field = (windowState?.fields || []).find((item) => item.key === key);
  return field ? field.enabled : true;
};

const must = (windowState, key) => {
  const field = (windowState?.fields || []).find((item) => item.key === key);
  if (!field) return key !== 'parentEmail';
  return field.enabled && field.required;
};

const visibleStepsFor = (windowState) => {
  const extras = windowState?.customFields || [];
  const education = (asked(windowState, 'course') && (windowState?.courses || []).length > 0)
    || asked(windowState, 'qualification')
    || extras.some((field) => field.step === 2);
  const steps = [{ id: 1, label: 'Personal Details' }];
  if (education) steps.push({ id: 2, label: 'Educational Details' });
  if (asked(windowState, 'photo') || asked(windowState, 'signature')) steps.push({ id: 3, label: 'Photo & Signature' });
  steps.push({ id: 4, label: 'Payment' });
  return steps;
};

const Stepper = ({ step, steps }) => {
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === step));
  const current = steps[currentIndex];
  return (
    <>
    <div className="mx-auto w-full max-w-xs sm:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#041F45]">{current?.label}</p>
        <p className="text-[11px] font-medium text-slate-400">{currentIndex + 1} / {steps.length}</p>
      </div>
      <div className="mt-2 flex gap-1">
        {steps.map((item, index) => (
          <span
            key={item.id}
            className={`h-1 flex-1 rounded-full ${index <= currentIndex ? 'bg-[#041F45]' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
    <ol className="mx-auto hidden w-full max-w-3xl sm:flex">
      {steps.map((item, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const line = done ? 'bg-[#041F45]' : 'bg-slate-200';
        return (
          <li key={item.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${index === 0 ? 'bg-transparent' : line}`} />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-[#041F45] text-white'
                    : active
                      ? 'bg-white text-[#041F45] ring-2 ring-[#041F45]'
                      : 'bg-white text-slate-400 ring-1 ring-slate-300'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <path d="M3.5 8.2 6.4 11l6.1-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : index + 1}
              </span>
              <span className={`h-0.5 flex-1 ${index === steps.length - 1 ? 'bg-transparent' : done ? 'bg-[#041F45]' : 'bg-slate-200'}`} />
            </div>
            <span className={`mt-2 px-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-[11px] ${
              active ? 'text-[#041F45]' : done ? 'text-slate-700' : 'text-slate-400'
            }`}>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
    </>
  );
};

const ApplyPage = () => {
  const { token } = useParams();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [windowState, setWindowState] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [paymentToken, setPaymentToken] = useState('');
  const [acknowledgementUrl, setAcknowledgementUrl] = useState('');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [extraFiles, setExtraFiles] = useState({});
  const [photoPreview, setPhotoPreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');
  const [savedPhoto, setSavedPhoto] = useState('');
  const [savedSignature, setSavedSignature] = useState('');
  const [savedFiles, setSavedFiles] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(token ? `${apiBase}/registrations/form/${token}` : `${apiBase}/registrations/window`);
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setMissing(true);
          return;
        }
        if (!response.ok) {
          setLoadError(data.message || 'Could not load the form');
          return;
        }
        setWindowState(data);
        if (data.submitted) {
          setPaymentToken(token || '');
          setSubmitted(true);
          return;
        }
        if (data.lead) {
          setForm((current) => ({
            ...current,
            firstName: data.lead.firstName || '',
            lastName: data.lead.lastName || '',
            email: data.lead.email || '',
            mobile: data.lead.mobile || '',
            courseId: data.lead.courseId || '',
          }));
        }
        if (data.draft?.savedStep) {
          const draft = data.draft;
          const dob = splitDob(draft.dob);
          setForm((current) => {
            const academics = { ...current.academics };
            if (draft.savedStep >= 2) {
              Object.entries(draft.academics || {}).forEach(([level, record]) => {
                if (academics[level]) academics[level] = draftRecord(record);
              });
            }
            return {
              ...current,
              ...(draft.savedStep >= 1 ? {
                firstName: draft.firstName || '',
                lastName: draft.lastName || '',
                gender: draft.gender || '',
                ...dob,
                category: draft.category || '',
                fatherName: draft.fatherName || '',
                motherName: draft.motherName || '',
                mobile: draft.mobile || '',
                parentMobile: draft.parentMobile || '',
                email: draft.email || '',
                parentEmail: draft.parentEmail || '',
                address: draft.address || '',
                city: draft.city || '',
                state: draft.state || '',
                country: draft.country || 'India',
                pin: draft.pin || '',
                extra: { ...current.extra, ...(draft.extra || {}) },
              } : {}),
              ...(draft.savedStep >= 2 ? {
                courseId: draft.courseId || '',
                qualification: draft.qualification || '',
                examCentreFirst: draft.examCentreFirst || '',
                examCentreSecond: draft.examCentreSecond || '',
                academics,
              } : {}),
            };
          });
          setSavedPhoto(uploadHref(apiBase, draft.photoUrl));
          setSavedSignature(uploadHref(apiBase, draft.signatureUrl));
          setSavedFiles(Object.fromEntries(
            Object.entries(draft.files || {}).map(([id, url]) => [id, uploadHref(apiBase, url)])
          ));
          if (draft.resumeStep) setStep(draft.resumeStep);
        }
      } catch (loadError) {
        setLoadError('Could not load the form. Check that the server is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiBase, token]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!signature) {
      setSignaturePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(signature);
    setSignaturePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [signature]);

  const courses = windowState?.courses || [];
  const courseName = courses.find((course) => course._id === form.courseId)?.name || '';

  const set = (name) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  // State drives the district list; a district that no longer belongs to the chosen state is cleared
  const setState = (value) => {
    setForm((current) => {
      const districts = districtsForState(value);
      const keepCity = !current.city || districts.some((d) => d.toLowerCase() === current.city.trim().toLowerCase());
      return { ...current, state: value, city: keepCity ? current.city : '' };
    });
    setError('');
  };

  const setCity = (value) => {
    setForm((current) => ({ ...current, city: value }));
    setError('');
  };

  const setExtra = (id) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, extra: { ...current.extra, [id]: value } }));
    setError('');
  };

  const setExtraFile = (id) => (event) => {
    const file = event.target.files?.[0] || null;
    setExtraFiles((current) => ({ ...current, [id]: file }));
    setError('');
  };

  // Only blocks the student started are sent; the backend validates each one
  const academicsPayload = () => Object.fromEntries(
    EDUCATION_CHOICES.filter((level) => recordStarted(form.academics[level])).map((level) => [level, form.academics[level]])
  );

  const setAcademic = (level, field) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      const record = { ...current.academics[level], [field]: value };
      if (field === 'scoreType' || (field === 'passingYear' && isAppearingStudent(value))) {
        record.marksObtained = '';
        record.maximumMarks = '';
        record.percentage = '';
        record.cgpa = '';
      }
      if (field === 'marksObtained' || field === 'maximumMarks') {
        record.percentage = calculatedPercentage(record.marksObtained, record.maximumMarks);
      }
      return {
        ...current,
        academics: {
          ...current.academics,
          [level]: record,
        },
      };
    });
    setError('');
  };

  const feeLabel = useMemo(() => {
    const fee = Number(windowState?.registrationFee) || 0;
    return fee > 0 ? rupee.format(fee) : '';
  }, [windowState]);

  const steps = useMemo(() => visibleStepsFor(windowState), [windowState]);
  const on = (key) => asked(windowState, key);
  const required = (key) => must(windowState, key);
  const extrasFor = (stepId) => (windowState?.customFields || []).filter((field) => field.step === stepId);

  const checkExtra = (stepId) => {
    for (const field of extrasFor(stepId)) {
      if (field.type === 'file') {
        const file = extraFiles[field.id];
        if (field.required && !file && !savedFiles[field.id]) return `Upload ${field.label}`;
        if (file && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          return `${field.label} must be a PDF, JPG, PNG, or WEBP file`;
        }
        if (file && file.size > 5 * 1024 * 1024) return `${field.label} must be 5 MB or smaller`;
        continue;
      }
      const value = String(form.extra?.[field.id] || '').trim();
      if (field.required && !value) return `${field.label} is required`;
      if (!value) continue;
      if (field.type === 'number' && !Number.isFinite(Number(value))) return `${field.label} must be a number`;
      if (field.type === 'select' && !(field.options || []).includes(value)) return `Select ${field.label}`;
      if (field.type === 'yesno' && value !== 'Yes' && value !== 'No') return `Select ${field.label}`;
    }
    return '';
  };

  const filled = (key, value) => required(key) && !String(value || '').trim();

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) return 'Enter the first and last name';
      if (on('gender') && required('gender') && !form.gender) return 'Select a gender';
      if (on('dob')) {
        const dob = buildDob(form.dobDay, form.dobMonth, form.dobYear);
        const started = form.dobDay || form.dobMonth || form.dobYear;
        if (required('dob') && !dob) return 'Select a valid date of birth';
        if (started && !dob) return 'Select a valid date of birth';
      }
      if (on('category') && required('category') && !form.category) return 'Select a category';
      if (filled('fatherName', form.fatherName)) return "Father's name is required";
      if (filled('motherName', form.motherName)) return "Mother's name is required";
      if (!/^[0-9]{10}$/.test(form.mobile.trim())) return 'Mobile must be a 10 digit number';
      if (on('parentMobile') && (required('parentMobile') || form.parentMobile.trim()) && !/^[0-9]{10}$/.test(form.parentMobile.trim())) {
        return "Parent's mobile must be a 10 digit number";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid student email';
      if (on('parentEmail') && (required('parentEmail') || form.parentEmail.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim())) {
        return 'Enter a valid parent email';
      }
      if (filled('address', form.address) || filled('city', form.city) || filled('state', form.state) || filled('country', form.country)) {
        return 'Enter the address, city, state and country';
      }
      if (on('pin') && (required('pin') || form.pin.trim()) && !/^[0-9]{6}$/.test(form.pin.trim())) {
        return 'Pin must be a 6 digit number';
      }
      const extraProblem = checkExtra(1);
      if (extraProblem) return extraProblem;
    }

    if (currentStep === 2) {
      if (on('course') && courses.length > 0 && required('course') && !form.courseId) return 'Select a course';
      if (on('qualification')) {
        const started = EDUCATION_CHOICES.filter((level) => recordStarted(form.academics[level]));
        if (!started.length) return 'Enter the Class XII details or the Diploma details (at least one)';
        for (const level of started) {
          const spec = EDUCATION_SECTIONS[level];
          const record = form.academics[level];
          if (!record.board.trim() || !record.passingYear || !record.school.trim() || !record.stream.trim()) {
            return `Complete the ${spec.title.toLowerCase()} or leave the whole block empty`;
          }
          if (isAppearingStudent(record.passingYear)) continue;
          if (record.scoreType === 'cgpa') {
            if (record.cgpa !== '') {
              const cgpa = Number(record.cgpa);
              if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) return `${spec.title} CGPA must be between 0 and 10`;
            }
          } else if (record.marksObtained !== '' || record.maximumMarks !== '') {
            if (record.marksObtained === '' || record.maximumMarks === '') return `Enter the ${spec.title} marks obtained and maximum marks`;
            const got = Number(record.marksObtained);
            const max = Number(record.maximumMarks);
            if (!Number.isFinite(got) || !Number.isFinite(max) || got < 0 || max <= 0) return `Enter valid ${spec.title} marks`;
            if (got > max) return `${spec.title} marks obtained cannot be more than the maximum marks`;
          }
        }
      }
      const extraProblem = checkExtra(2);
      if (extraProblem) return extraProblem;
    }

    if (currentStep === 3) {
      const imageProblem = (file, label, needed, savedUrl) => {
        if (needed && !file && !savedUrl) return `Upload a ${label} to continue`;
        if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return `${label} must be a JPG, PNG, or WEBP image`;
        if (file && file.size > 512 * 1024) return `${label} must be 512 KB or smaller`;
        return '';
      };
      if (on('photo')) {
        const problem = imageProblem(photo, 'passport size photo', required('photo'), savedPhoto);
        if (problem) return problem.charAt(0).toUpperCase() + problem.slice(1);
      }
      if (on('signature')) {
        const problem = imageProblem(signature, 'signature', required('signature'), savedSignature);
        if (problem) return problem.charAt(0).toUpperCase() + problem.slice(1);
      }
    }

    return '';
  };

  const advance = () => {
    const index = steps.findIndex((item) => item.id === step);
    const next = steps[index + 1];
    if (next) setStep(next.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveCurrentStep = async () => {
    const payload = new FormData();
    const appendExtras = (stepId) => {
      const fields = extrasFor(stepId);
      payload.append('extraAnswers', JSON.stringify(
        fields.filter((field) => field.type !== 'file').map((field) => ({
          id: field.id,
          value: String(form.extra?.[field.id] || '').trim(),
        }))
      ));
      fields.forEach((field) => {
        if (field.type === 'file' && extraFiles[field.id]) {
          payload.append(`extraFile_${field.id}`, extraFiles[field.id]);
        }
      });
    };

    if (step === 1) {
      const dob = buildDob(form.dobDay, form.dobMonth, form.dobYear);
      payload.append('firstName', form.firstName.trim());
      payload.append('lastName', form.lastName.trim());
      if (on('gender')) payload.append('gender', form.gender);
      if (on('dob') && dob) payload.append('dob', dob);
      if (on('category')) payload.append('category', form.category);
      if (on('fatherName')) payload.append('fatherName', form.fatherName.trim());
      if (on('motherName')) payload.append('motherName', form.motherName.trim());
      payload.append('mobile', form.mobile.trim());
      if (on('parentMobile')) payload.append('parentMobile', form.parentMobile.trim());
      payload.append('email', form.email.trim());
      if (on('parentEmail')) payload.append('parentEmail', form.parentEmail.trim());
      if (on('address')) payload.append('address', form.address.trim());
      if (on('city')) payload.append('city', form.city.trim());
      if (on('state')) payload.append('state', form.state.trim());
      if (on('country')) payload.append('country', form.country.trim());
      if (on('pin')) payload.append('pin', form.pin.trim());
      appendExtras(1);
    }

    if (step === 2) {
      if (on('course')) payload.append('courseId', form.courseId);
      if (on('qualification')) {
        payload.append('academics', JSON.stringify(academicsPayload()));
      }
      appendExtras(2);
    }

    if (step === 3) {
      if (on('photo') && photo) payload.append('photo', photo);
      if (on('signature') && signature) payload.append('signature', signature);
    }

    const response = await fetch(`${apiBase}/registrations/form/${token}/step/${step}`, {
      method: 'POST',
      body: payload,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const saveError = new Error(data.message || 'Could not save this section');
      saveError.step = data.step;
      throw saveError;
    }
    if (data.photoUrl) setSavedPhoto(uploadHref(apiBase, data.photoUrl));
    if (data.signatureUrl) setSavedSignature(uploadHref(apiBase, data.signatureUrl));
  };

  const goNext = async () => {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    if (!token) {
      advance();
      return;
    }
    setSaving(true);
    try {
      await saveCurrentStep();
      advance();
    } catch (saveError) {
      if (saveError.step) setStep(saveError.step);
      setError(saveError.message || 'Could not save this section');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setError('');
    const index = steps.findIndex((item) => item.id === step);
    const previous = steps[Math.max(0, index - 1)];
    if (previous) setStep(previous.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const chooseImage = (input) => {
    if (!input) return;
    input.value = '';
    input.click();
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setError('');
  };

  const handleSignature = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSignature(file);
    setError('');
  };

  const handleSubmit = async () => {
    const problem = [1, 2, 3].map(validateStep).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }

    const dob = buildDob(form.dobDay, form.dobMonth, form.dobYear);
    const payload = new FormData();
    payload.append('firstName', form.firstName.trim());
    payload.append('lastName', form.lastName.trim());
    if (on('gender')) payload.append('gender', form.gender);
    if (on('dob') && dob) payload.append('dob', dob);
    if (on('category')) payload.append('category', form.category);
    if (on('fatherName')) payload.append('fatherName', form.fatherName.trim());
    if (on('motherName')) payload.append('motherName', form.motherName.trim());
    payload.append('mobile', form.mobile.trim());
    if (on('parentMobile')) payload.append('parentMobile', form.parentMobile.trim());
    payload.append('email', form.email.trim());
    if (on('parentEmail')) payload.append('parentEmail', form.parentEmail.trim());
    if (on('address')) payload.append('address', form.address.trim());
    if (on('city')) payload.append('city', form.city.trim());
    if (on('state')) payload.append('state', form.state.trim());
    if (on('country')) payload.append('country', form.country.trim());
    if (on('pin')) payload.append('pin', form.pin.trim());
    if (on('course')) payload.append('courseId', form.courseId);
    if (on('qualification')) {
      payload.append('academics', JSON.stringify(academicsPayload()));
    }
    payload.append('extraAnswers', JSON.stringify(
      (windowState.customFields || []).filter((field) => field.type !== 'file').map((field) => ({
        id: field.id,
        value: String(form.extra?.[field.id] || '').trim(),
      }))
    ));
    (windowState.customFields || []).forEach((field) => {
      if (field.type === 'file' && extraFiles[field.id]) {
        payload.append(`extraFile_${field.id}`, extraFiles[field.id]);
      }
    });
    if (on('photo') && photo) payload.append('photo', photo);
    if (on('signature') && signature) payload.append('signature', signature);

    setSaving(true);
    setError('');
    try {
      const response = await fetch(token ? `${apiBase}/registrations/form/${token}` : `${apiBase}/registrations/apply`, {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.step) setStep(data.step);
        setError(data.message || 'Could not submit the form');
        return;
      }
      setCredentials(data.temporaryPassword ? { email: data.email, temporaryPassword: data.temporaryPassword } : null);
      setPaymentToken(data.registrationToken || token || '');
      setAcknowledgementUrl(data.acknowledgementUrl || '');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError('Could not submit the form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src={LogoImage} alt="IIAE" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-bold text-slate-900">IIAE New Delhi</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Student registration</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading && <p className="text-sm text-slate-500">Loading the form...</p>}

        {!loading && missing && (
          <p className="text-sm text-slate-600">This registration link is not valid. Ask the counsellor for a new link.</p>
        )}

        {!loading && !missing && loadError && (
          <p className="text-sm text-slate-600">{loadError}</p>
        )}

        {!loading && !missing && !loadError && submitted && (
          <section className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 p-6">
            <h1 className="text-lg font-semibold text-slate-900">Application submitted</h1>
            <p className="text-sm text-slate-600">
              Pay the registration fee below to complete your application. You can also pay later from your student dashboard.
            </p>
            {acknowledgementUrl && (
              <a
                href={`${apiBase.replace(/\/api\/?$/, '')}${acknowledgementUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Download acknowledgement (PDF)
              </a>
            )}
            {paymentToken && <RegistrationFeePayment token={paymentToken} />}
            {paymentToken && (
              <RegistrationPaymentShare
                token={paymentToken}
                studentName={`${form.firstName} ${form.lastName}`.trim()}
                email={form.email}
                phone={form.mobile}
              />
            )}
            {credentials && (
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-900">Student login</p>
                <p>Email: {credentials.email}</p>
                <p>Temporary password: {credentials.temporaryPassword}</p>
                <p className="text-xs text-slate-500">Save this password. It is shown only once.</p>
              </div>
            )}
            <Link to={credentials ? '/login' : '/dashboard/student/profile'} className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
              {credentials ? 'Go to login' : 'Go to dashboard'}
            </Link>
          </section>
        )}

        {!loading && !missing && !loadError && !submitted && windowState && !windowState.open && (
          <section className="mx-auto max-w-xl space-y-3 rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              {windowState.phase === 'scheduled' ? 'Opens later' : 'Registration closed'}
            </p>
            <h1 className="text-lg font-semibold text-slate-900">{windowState.message}</h1>
            <p className="text-sm text-slate-600">
              The form accepts new students only while it is live. Come back when registration is open.
            </p>
          </section>
        )}

        {!loading && !missing && !loadError && !submitted && windowState?.open && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-slate-900">IIAE Student Registration</h1>
              <p className="text-sm text-slate-500">Each step is saved when you continue. If you leave, the sections you already saved stay on your application.</p>
            </div>

            <Stepper step={step} steps={steps} />

            <section className="space-y-6">
              {step === 1 && (
                <>
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">Student&apos;s Personal Information</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
                    <Field label="First Name" required>
                      <input value={form.firstName} onChange={set('firstName')} className={control} />
                    </Field>
                    <Field label="Last Name" required>
                      <input value={form.lastName} onChange={set('lastName')} className={control} />
                    </Field>
                    {on('gender') && (
                      <Field label="Gender" required={required('gender')}>
                        <Select value={form.gender} onChange={set('gender')} placeholder="Select Gender">
                          {(windowState.genders || []).map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                        </Select>
                      </Field>
                    )}
                    {on('dob') && (
                      <Field label="DOB" required={required('dob')}>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={form.dobDay} onChange={set('dobDay')} placeholder="Day">
                            {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </Select>
                          <Select value={form.dobMonth} onChange={set('dobMonth')} placeholder="Month">
                            {MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </Select>
                          <Select value={form.dobYear} onChange={set('dobYear')} placeholder="Year">
                            {birthYears.map((year) => <option key={year} value={year}>{year}</option>)}
                          </Select>
                        </div>
                      </Field>
                    )}
                    {on('category') && (
                      <Field label="Category" required={required('category')}>
                        <Select value={form.category} onChange={set('category')} placeholder="Select Category">
                          {(windowState.categories || []).map((category) => <option key={category} value={category}>{category}</option>)}
                        </Select>
                      </Field>
                    )}
                    {on('fatherName') && (
                      <Field label="Father's Name" required={required('fatherName')}>
                        <input value={form.fatherName} onChange={set('fatherName')} className={control} />
                      </Field>
                    )}
                    {on('motherName') && (
                      <Field label="Mother's Name" required={required('motherName')}>
                        <input value={form.motherName} onChange={set('motherName')} className={control} />
                      </Field>
                    )}
                    <Field label="Mobile" required>
                      <input inputMode="numeric" maxLength={10} value={form.mobile} onChange={set('mobile')} className={control} />
                    </Field>
                    {on('parentMobile') && (
                      <Field label="Parent's Mobile" required={required('parentMobile')}>
                        <input inputMode="numeric" maxLength={10} value={form.parentMobile} onChange={set('parentMobile')} className={control} />
                      </Field>
                    )}
                    <Field label="Student Email Id" required>
                      <input type="email" value={form.email} onChange={set('email')} className={control} />
                    </Field>
                    {on('parentEmail') && (
                      <Field label="Parent's Email Id" required={required('parentEmail')} hint={required('parentEmail') ? '' : 'Optional'}>
                        <input type="email" value={form.parentEmail} onChange={set('parentEmail')} className={control} />
                      </Field>
                    )}
                    {on('state') && (
                      <Field label="State" required={required('state')}>
                        <AutocompleteSelect
                          name="state"
                          value={form.state}
                          onChange={setState}
                          options={INDIA_STATES}
                          placeholder="Start typing your state"
                          className={control}
                        />
                      </Field>
                    )}
                    {on('city') && (
                      <Field label="District" required={required('city')} hint={on('state') && !form.state.trim() ? 'Select the state first' : ''}>
                        <AutocompleteSelect
                          name="district"
                          value={form.city}
                          onChange={setCity}
                          options={districtsForState(form.state)}
                          disabled={on('state') && !form.state.trim()}
                          placeholder={on('state') && !form.state.trim() ? 'Select the state first' : 'Start typing your district'}
                          emptyText={districtsForState(form.state).length ? 'No matching district' : 'Type your district'}
                          className={`${control} disabled:bg-slate-100 disabled:text-slate-500`}
                        />
                      </Field>
                    )}
                    {on('address') && (
                      <Field label="Address" required={required('address')}>
                        <textarea rows="2" value={form.address} onChange={set('address')} className={`${control} resize-none`} />
                      </Field>
                    )}
                    {on('country') && (
                      <Field label="Country" required={required('country')}>
                        <input value={form.country} onChange={set('country')} className={control} />
                      </Field>
                    )}
                    {on('pin') && (
                      <Field label="Pin" required={required('pin')}>
                        <input inputMode="numeric" maxLength={6} value={form.pin} onChange={set('pin')} className={control} />
                      </Field>
                    )}
                  </div>
                  <ExtraFields fields={extrasFor(1)} values={form.extra} files={extraFiles} savedFiles={savedFiles} onChange={setExtra} onFile={setExtraFile} />
                </>
              )}

              {step === 2 && (
                <>
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">Educational Details</h2>
                  </div>
                  {on('course') && courses.length > 0 && (
                    <div className="max-w-xl">
                      <Field label="Course" required={required('course')}>
                        <Select value={form.courseId} onChange={set('courseId')} placeholder="Select a course">
                          {courses.map((course) => (
                            <option key={course._id} value={course._id}>{course.name}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  )}
                  {on('qualification') && (
                    <>
                      <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                        Fill in your Class XII details, your Diploma details, or both. At least one is required.
                      </p>
                      {EDUCATION_CHOICES.map((level) => (
                        <EducationBlock
                          key={level}
                          spec={EDUCATION_SECTIONS[level]}
                          value={form.academics[level]}
                          years={passingYearOptions}
                          onChange={(field) => setAcademic(level, field)}
                          required={recordStarted(form.academics[level])}
                          hint={recordStarted(form.academics[level]) ? '' : 'Optional if you fill the other block'}
                        />
                      ))}
                    </>
                  )}
                  <ExtraFields fields={extrasFor(2)} values={form.extra} files={extraFiles} savedFiles={savedFiles} onChange={setExtra} onFile={setExtraFile} />
                </>
              )}

              {step === 3 && (
                <>
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">Passport photo and signature</h2>
                    <p className="mt-1 text-sm text-slate-500">Optional. You can skip this step if you do not have the images yet.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    {on('photo') && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Passport size photo {required('photo') && <span className="text-rose-600">*</span>}
                        </p>
                        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="sr-only" />
                        {(photoPreview || savedPhoto) ? (
                          <div className="space-y-3">
                            <img src={photoPreview || savedPhoto} alt="Selected passport photo" className="h-36 w-28 rounded-md border border-slate-200 object-cover" />
                            <p className="text-sm font-medium text-slate-700">{photo?.name || 'Current photo'}</p>
                            <button type="button" onClick={() => chooseImage(photoInputRef.current)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                              Replace photo
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => chooseImage(photoInputRef.current)} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary">
                            Choose photo
                          </button>
                        )}
                        <p className="text-sm text-slate-500">JPG, PNG, or WEBP. Maximum size 512 KB. You can replace it before submitting.</p>
                      </div>
                    )}
                    {on('signature') && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Signature {required('signature') && <span className="text-rose-600">*</span>}
                        </p>
                        <input ref={signatureInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSignature} className="sr-only" />
                        {(signaturePreview || savedSignature) ? (
                          <div className="space-y-3">
                            <img src={signaturePreview || savedSignature} alt="Selected signature" className="h-20 max-w-full rounded-md border border-slate-200 bg-white object-contain" />
                            <p className="text-sm font-medium text-slate-700">{signature?.name || 'Current signature'}</p>
                            <button type="button" onClick={() => chooseImage(signatureInputRef.current)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                              Replace signature
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => chooseImage(signatureInputRef.current)} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary">
                            Choose signature
                          </button>
                        )}
                        <p className="text-sm text-slate-500">JPG, PNG, or WEBP. Maximum size 512 KB. You can replace it before submitting.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">Payment</h2>
                  </div>
                  <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Student</p>
                      <p className="text-sm font-semibold text-slate-900">{form.firstName} {form.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email</p>
                      <p className="text-sm font-semibold text-slate-900">{form.email}</p>
                    </div>
                    {on('course') && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Course</p>
                        <p className="text-sm font-semibold text-slate-900">{courseName || 'Not selected'}</p>
                      </div>
                    )}
                    {(windowState.customFields || []).filter((field) => (
                      field.type === 'file' ? extraFiles[field.id] : String(form.extra?.[field.id] || '').trim()
                    )).map((field) => (
                      <div key={field.id}>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{field.label}</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {field.type === 'file' ? extraFiles[field.id].name : form.extra[field.id]}
                        </p>
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Registration fee</p>
                      <p className="text-lg font-bold text-slate-900">{feeLabel || 'No fee'}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {feeLabel
                          ? 'Submit the application, then pay this fee securely online with PayU on the next screen.'
                          : 'No registration fee is set. Submit the application and the institute will confirm it.'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

              <div className="flex gap-3">
                {step > 1 && (
                  <button type="button" onClick={goBack} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
                    Back
                  </button>
                )}
                {steps[steps.length - 1]?.id !== step ? (
                  <button type="button" onClick={goNext} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save & Continue'}
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
                    {saving ? 'Submitting...' : 'Submit application'}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default ApplyPage;
