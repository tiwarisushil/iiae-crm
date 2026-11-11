import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import LogoImage from '../assets/Logo.png';

const safeReturnPath = (value) => {
  const path = String(value || '').trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard';
  return path;
};

const LoginPage = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('forgot') ? 'forgot' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get('forgot')) setMode('forgot');
  }, [params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Welcome back to IIAE CRM!');
      navigate(safeReturnPath(params.get('returnUrl')));
    } else {
      toast.error(result.message);
    }
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter your email');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      toast.success(response.data.message || 'OTP sent to your email');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setMode('reset');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not generate an OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', { email, otp, password });
      toast.success(response.data.message || 'Password updated. You can log in now.');
      setPassword('');
      setOtp('');
      setConfirmPassword('');
      setMode('login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reset the password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setPassword('');
    setOtp('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img 
              src={LogoImage} 
              alt="IIAE Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><svg xmlns="http://www.w3.org/2500/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 rotate-45"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4.5 19.5 3c-1.5-1.5-3-1.5-4.5.5L11.5 7 3.3 5.2c-.9-.2-1.8.3-2 1.2V7c0 .4.2.8.5 1.1L9 12l-1.5 5.5c-.2.9.3 1.8 1.2 2h.2c.4 0 .8-.2 1.1-.5l4-4h.5l3.5 3.5c.3.3.7.5 1.1.5.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1Z"/></svg></div>';
              }}
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            IIAE Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
            Indian Institute of Aircraft Engineering
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          <h2 className="text-md font-extrabold text-slate-950 uppercase tracking-wider mb-6">
            {mode === 'login' ? 'Account Login' : mode === 'forgot' ? 'Forget password' : 'Reset password'}
          </h2>

          {mode === 'forgot' ? (
            <form onSubmit={requestOtp} className="space-y-5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@iiae.in"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/15"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Send OTP'
                )}
              </button>
              <button type="button" onClick={backToLogin} className="w-full text-xs font-bold text-slate-500 hover:text-blue-600">
                Back to login
              </button>
            </form>
          ) : mode === 'reset' ? (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm tracking-[0.3em] text-slate-800 placeholder:tracking-normal placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the new password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/15"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Reset password'
                )}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={requestOtp} disabled={isSubmitting} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Resend OTP
                </button>
                <button type="button" onClick={backToLogin} className="text-xs font-bold text-slate-500 hover:text-blue-600">
                  Back to login
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@iiae.in"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Forget password?
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/15"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Secure Login'
                )}
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Footer Details */}
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-8">
          &copy; {new Date().getFullYear()} IIAE New Delhi. Approved by DGCA, Govt. of India.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
