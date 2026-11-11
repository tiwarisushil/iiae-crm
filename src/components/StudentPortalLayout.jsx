import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import ExamSiteFooter from './ExamSiteFooter';
import BrandLogo from '../assets/iiae/IIAE-LOGO.png';

const LINKS = [
  { to: '/dashboard/student/profile', label: 'Profile' },
  { to: '/dashboard/student/payments', label: 'Payments' },
  { to: '/dashboard/student/admit-card', label: 'Admit Card' },
  { to: '/dashboard/student/results', label: 'Exam Results' },
  { to: '/dashboard/announcements', label: 'Announcements' },
];

const initials = (name) => {
  const letters = String(name || '').trim().split(/\s+/).filter(Boolean).map((part) => part[0]);
  return (letters.slice(0, 2).join('') || 'S').toUpperCase();
};

const StudentPortalLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const handleLogout = () => setConfirmLogout(true);
  const confirmAndLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="student-shell flex min-h-screen flex-col bg-[#f5f6f8] text-slate-900">
      <header className="sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-iiae-header px-5 py-3 sm:px-8">
          <Link to="/dashboard/student/profile" className="flex min-w-0 items-center gap-3">
            <img src={BrandLogo} alt="IIAE" className="h-12 w-auto shrink-0 object-contain sm:h-14" />
            <span className="text-sm font-semibold leading-snug text-white sm:text-base">
              Indian Institute of
              <br className="hidden sm:block" />
              Aircraft Engineering
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-iiae-gold text-sm font-semibold text-white sm:h-11 sm:w-11 sm:text-base">
                {initials(user?.name)}
              </span>
              <p className="max-w-[14rem] truncate text-sm font-semibold text-white sm:text-base">{user?.name}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:text-base"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto bg-iiae-gold px-3 sm:gap-2 sm:px-8" aria-label="Student">
          {LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`whitespace-nowrap px-3 py-2.5 text-sm transition sm:px-4 sm:py-3 ${
                  active
                    ? 'rounded-t-md bg-white/20 font-semibold text-white'
                    : 'font-medium text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-6">
        {children}
      </main>
      <ExamSiteFooter />
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="You will be signed out of the IIAE CRM on this device."
        confirmLabel="Log out"
        onConfirm={confirmAndLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};

export default StudentPortalLayout;
