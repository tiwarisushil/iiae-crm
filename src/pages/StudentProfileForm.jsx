import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import AutocompleteSelect from '../components/AutocompleteSelect';
import { INDIA_STATES, districtsForState } from '../data/indiaStatesDistricts';
import { useAuth } from '../context/AuthContext';

const GENDERS = ['Male', 'Female', 'Other'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

const EDUCATION = {
  classXII: { title: 'Class XII', board: 'Board', school: 'School', stream: 'Stream' },
};

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

const inputClass = 'input-field';

const fileHref = (value) => {
  if (!String(value || '').startsWith('/uploads/')) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
};

const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const recordFrom = (source) => ({
  ...blankRecord(),
  board: source?.board || '',
  passingYear: source?.passingYear || '',
  school: source?.school || '',
  stream: source?.stream || '',
  scoreType: source?.scoreType === 'cgpa' ? 'cgpa' : 'percentage',
  marksObtained: source?.marksObtained ? String(source.marksObtained) : '',
  maximumMarks: source?.maximumMarks ? String(source.maximumMarks) : '',
  percentage: source?.percentage ? String(source.percentage) : '',
  cgpa: source?.cgpa ? String(source.cgpa) : '',
});

const Label = ({ children, childrenInput }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</span>
    {childrenInput}
  </label>
);

const StudentProfileForm = ({ registration, pending, onCancel, onSaved }) => {
  const { patchUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(() => fileHref(registration.photoUrl));
  const [signaturePreview, setSignaturePreview] = useState(() => fileHref(registration.signatureUrl));

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(fileHref(registration.photoUrl));
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile, registration.photoUrl]);

  useEffect(() => {
    if (!signatureFile) {
      setSignaturePreview(fileHref(registration.signatureUrl));
      return undefined;
    }
    const url = URL.createObjectURL(signatureFile);
    setSignaturePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [signatureFile, registration.signatureUrl]);
  const [form, setForm] = useState(() => ({
    name: registration.name || '',
    email: registration.email || '',
    phone: registration.phone || '',
    alternatePhone: registration.alternatePhone || '',
    parentEmail: registration.parentEmail || '',
    parentMobile: registration.parentMobile || '',
    gender: registration.gender || '',
    dob: dateInput(registration.dob),
    category: registration.category || '',
    fatherName: registration.fatherName || '',
    motherName: registration.motherName || '',
    address: registration.address || '',
    city: registration.city || '',
    state: registration.state || '',
    country: registration.country || '',
    pin: registration.pin || '',
    academics: {
      classXII: recordFrom(registration.academics?.classXII),
    },
  }));

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const setRecord = (level, key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      academics: {
        ...current.academics,
        [level]: { ...current.academics[level], [key]: value },
      },
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'academics') body.append(key, JSON.stringify(value));
        else body.append(key, value ?? '');
      });
      body.append('qualification', '12th');
      if (photoFile) body.append('photo', photoFile);
      if (signatureFile) body.append('signature', signatureFile);
      const response = await api.put('/registrations/me', body, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      patchUser({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
      });
      toast.success('Profile updated');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the profile');
    } finally {
      setSaving(false);
    }
  };

  const level = 'classXII';
  const spec = EDUCATION[level];
  const record = form.academics[level];

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Edit profile</h2>
          <p className="mt-0.5 text-xs text-slate-500">Update the details on your student record.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-900">Account</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Label childrenInput={<input required value={form.name} onChange={set('name')} className={inputClass} />}>Name</Label>
          <Label childrenInput={<input required type="email" value={form.email} onChange={set('email')} className={inputClass} />}>Email</Label>
          <Label childrenInput={<input required value={form.phone} onChange={set('phone')} className={inputClass} />}>Mobile</Label>
          <Label childrenInput={<input value={form.alternatePhone} onChange={set('alternatePhone')} className={inputClass} />}>Alternative phone</Label>
          <Label childrenInput={<input type="email" value={form.parentEmail} onChange={set('parentEmail')} className={inputClass} />}>Parent email</Label>
        </div>
      </section>

      {!pending && (
        <>
          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Personal details</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Label childrenInput={(
                <select value={form.gender} onChange={set('gender')} className={inputClass}>
                  <option value="">Select</option>
                  {GENDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              )}>Gender</Label>
              <Label childrenInput={<input type="date" value={form.dob} onChange={set('dob')} className={inputClass} />}>Date of birth</Label>
              <Label childrenInput={(
                <select value={form.category} onChange={set('category')} className={inputClass}>
                  <option value="">Select</option>
                  {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              )}>Category</Label>
              <Label childrenInput={<input value={form.fatherName} onChange={set('fatherName')} className={inputClass} />}>Father's name</Label>
              <Label childrenInput={<input value={form.motherName} onChange={set('motherName')} className={inputClass} />}>Mother's name</Label>
              <Label childrenInput={<input value={form.parentMobile} onChange={set('parentMobile')} className={inputClass} />}>Parent mobile</Label>
            </div>
          </section>

          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Address</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="sm:col-span-2 xl:col-span-3">
                <Label childrenInput={<input value={form.address} onChange={set('address')} className={inputClass} />}>Address</Label>
              </div>
              <Label childrenInput={(
                <AutocompleteSelect
                  value={form.state}
                  options={INDIA_STATES}
                  placeholder="Start typing your state"
                  className={inputClass}
                  onChange={(value) => setForm((current) => {
                    const districts = districtsForState(value);
                    const keep = !current.city || districts.some((d) => d.toLowerCase() === current.city.trim().toLowerCase());
                    return { ...current, state: value, city: keep ? current.city : '' };
                  })}
                />
              )}>State</Label>
              <Label childrenInput={(
                <AutocompleteSelect
                  value={form.city}
                  options={districtsForState(form.state)}
                  disabled={!String(form.state || '').trim()}
                  placeholder={String(form.state || '').trim() ? 'Start typing your district' : 'Select the state first'}
                  className={inputClass}
                  onChange={(value) => setForm((current) => ({ ...current, city: value }))}
                />
              )}>District</Label>
              <Label childrenInput={<input value={form.country} onChange={set('country')} className={inputClass} />}>Country</Label>
              <Label childrenInput={<input value={form.pin} onChange={set('pin')} className={inputClass} />}>PIN</Label>
            </div>
          </section>

          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900">{spec.title}</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Label childrenInput={<input value={record.board} onChange={setRecord(level, 'board')} className={inputClass} />}>{spec.board}</Label>
              <Label childrenInput={<input value={record.passingYear} onChange={setRecord(level, 'passingYear')} className={inputClass} />}>Passing year</Label>
              <Label childrenInput={<input value={record.school} onChange={setRecord(level, 'school')} className={inputClass} />}>{spec.school}</Label>
              <Label childrenInput={<input value={record.stream} onChange={setRecord(level, 'stream')} className={inputClass} />}>{spec.stream}</Label>
              <Label childrenInput={(
                <select value={record.scoreType} onChange={setRecord(level, 'scoreType')} className={inputClass}>
                  <option value="percentage">Percentage</option>
                  <option value="cgpa">CGPA</option>
                </select>
              )}>Result type</Label>
              {record.scoreType === 'cgpa' ? (
                <Label childrenInput={<input value={record.cgpa} onChange={setRecord(level, 'cgpa')} className={inputClass} />}>CGPA</Label>
              ) : (
                <>
                  <Label childrenInput={<input value={record.marksObtained} onChange={setRecord(level, 'marksObtained')} className={inputClass} />}>Marks obtained</Label>
                  <Label childrenInput={<input value={record.maximumMarks} onChange={setRecord(level, 'maximumMarks')} className={inputClass} />}>Maximum marks</Label>
                </>
              )}
            </div>
          </section>

          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Photo and signature</h3>
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Photograph</p>
                {photoPreview ? (
                  <img src={photoPreview} alt="Current photograph" className="mt-3 h-40 w-32 rounded-2xl border border-slate-200 object-cover" />
                ) : (
                  <p className="mt-3 text-base text-slate-500">No photograph uploaded</p>
                )}
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-500">Replace photograph</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} className={inputClass} />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Signature</p>
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Current signature" className="mt-3 h-24 w-56 rounded-2xl border border-slate-200 bg-slate-50 object-contain p-3" />
                ) : (
                  <p className="mt-3 text-base text-slate-500">No signature uploaded</p>
                )}
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-500">Replace signature</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setSignatureFile(event.target.files?.[0] || null)} className={inputClass} />
                </label>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-outline">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default StudentProfileForm;
