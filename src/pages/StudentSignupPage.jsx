import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ExamSiteHeader from '../components/ExamSiteHeader';
import ExamSiteFooter from '../components/ExamSiteFooter';
import PasswordInput from '../components/PasswordInput';
import TermsModal from '../components/TermsModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const inputClass = 'w-full rounded-lg border-0 bg-white px-4 py-3 text-base text-slate-900 outline-none';
const labelClass = 'mb-2 block text-sm text-white';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  parentEmail: '',
  password: '',
  confirmPassword: '',
  phone: '',
  alternatePhone: '',
  agreed: false,
};

const StudentSignupPage = () => {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.agreed) {
      toast.error('Agree to the terms to create an account');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Re-enter the same password');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        parentEmail: form.parentEmail.trim(),
        password: form.password,
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim(),
      });
      establishSession(response.data);
      toast.success('Account created');
      try {
        const continued = await api.post('/registrations/continue');
        navigate(continued.data.registrationPath);
      } catch (continueError) {
        toast.error(continueError.response?.data?.message || 'Could not open the registration form');
        navigate('/dashboard/student/profile');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create the account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <ExamSiteHeader />
      <main className="mx-auto flex max-w-3xl justify-center px-4 py-10 sm:py-14">
        <form onSubmit={handleSubmit} className="w-full rounded-[28px] bg-[#2F5C95] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-9">
          <h1 className="text-3xl font-semibold tracking-tight">AIAEE 2027, AME Entrance Exam</h1>
          <p className="mt-2 text-lg font-semibold text-white/90">Registration Form</p>
          <div className="mt-2 h-1 w-14 rounded bg-[#F5C400]" />

          <>
              <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>First Name *</span>
                  <input required value={form.firstName} onChange={set('firstName')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Last Name</span>
                  <input value={form.lastName} onChange={set('lastName')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Email Address *</span>
                  <input required type="email" value={form.email} onChange={set('email')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Parent Email Address</span>
                  <input type="email" value={form.parentEmail} onChange={set('parentEmail')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Password *</span>
                  <PasswordInput required minLength={8} value={form.password} onChange={set('password')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Re-Enter Password</span>
                  <PasswordInput required minLength={8} value={form.confirmPassword} onChange={set('confirmPassword')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Phone Number *</span>
                  <input required value={form.phone} onChange={set('phone')} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Alternative Phone Number</span>
                  <input value={form.alternatePhone} onChange={set('alternatePhone')} className={inputClass} />
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input required type="checkbox" checked={form.agreed} onChange={set('agreed')} className="h-4 w-4 rounded-sm border-0" />
                  <span>
                    I agree to the{' '}
                    <button type="button" onClick={() => setTermsOpen(true)} className="font-semibold underline underline-offset-2 hover:text-[#F5C400]">
                      terms and conditions
                    </button>
                  </span>
                </label>
                <Link to="/login?forgot=1" className="text-white hover:underline">Forgot password?</Link>
              </div>

              <button type="submit" disabled={submitting} className="mt-5 w-full rounded-lg bg-[#F82900] py-3.5 text-base font-semibold text-white disabled:opacity-60">
                {submitting ? 'Please wait...' : 'Create Account'}
              </button>

              <p className="mt-5 text-center text-sm">
                Already have an account? <Link to="/login" className="font-semibold hover:underline">Sign in</Link>
              </p>
          </>
        </form>
      </main>
      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setForm((current) => ({ ...current, agreed: true }));
          setTermsOpen(false);
        }}
      />
      <ExamSiteFooter />
    </div>
  );
};

export default StudentSignupPage;
