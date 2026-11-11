import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LogoImage from '../assets/Logo.png';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import { useSession } from '../context/SessionContext';
import SessionSelector from './SessionSelector';
import NotificationBell from './notifications/NotificationBell';
import WhileYouWereAway from './notifications/WhileYouWereAway';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  IndianRupee,
  Link2,
  BellRing,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Mail,
  Settings,
  UploadCloud,
  Megaphone,
  Plug,
  Headset,
  CalendarRange,
  Globe
} from 'lucide-react';

const initialsOf = (name) => (
  name ? name.split(' ').map((part) => part[0]).join('').toUpperCase() : 'U'
);

const AccountMenu = ({ user, collapsed = false, onLogout }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`crm-sidebar-user relative shrink-0 border-t border-slate-100 bg-slate-50/40 ${collapsed ? 'px-2 py-2.5' : 'px-2 py-2'}`}>
      {open && (
        <div className={`absolute z-40 bottom-[calc(100%+8px)] rounded-sm border border-slate-200 bg-white shadow-xl ${collapsed ? 'left-1 w-64' : 'left-1 right-1'}`}>
          <div className="px-3.5 pt-3.5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ame-navy flex items-center justify-center font-bold text-white text-sm shrink-0">
                {initialsOf(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{user?.name}</p>
                <span className="text-xs uppercase tracking-wide font-bold px-2 py-0.5 rounded-full inline-block mt-1 text-slate-700 bg-slate-100 border border-slate-200">
                  {user?.role}
                </span>
              </div>
            </div>
            <dl className="mt-3 space-y-2.5">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-900">Email</dt>
                <dd className="text-sm font-semibold text-slate-900 break-all">{user?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-900">Phone</dt>
                <dd className="text-sm font-semibold text-slate-900">{user?.phone || '—'}</dd>
              </div>
              {user?.status && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-900">Status</dt>
                  <dd className="text-sm font-semibold text-slate-900 capitalize">{user.status}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="px-3.5 py-3 border-t border-slate-100">
            <SessionSelector block />
          </div>
          <div className="p-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-base font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center rounded-sm hover:bg-white cursor-pointer ${collapsed ? 'justify-center p-1' : 'gap-2 px-1.5 py-1.5'}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={user?.name || 'Account'}
      >
        <div className="w-8 h-8 rounded-full bg-ame-navy flex items-center justify-center font-bold text-white text-[11px] shrink-0">
          {initialsOf(user?.name)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold truncate text-slate-900 leading-tight">{user?.name}</p>
              {user?.email && (
                <p className="text-xs font-medium text-slate-900 truncate mt-0.5">{user.email}</p>
              )}
            </div>
            <ChevronUp className={`w-3.5 h-3.5 text-slate-900 shrink-0 transition-transform ${open ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>
    </div>
  );
};

const menuActive = 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none';
const menuIdle = 'text-slate-700 hover:bg-slate-100 hover:text-slate-900';

const SubNavLink = ({ to, active, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center justify-between rounded-sm px-3 py-2 text-sm font-semibold transition-all ${active ? menuActive : menuIdle}`}
  >
    <span className="truncate">{children}</span>
    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white" />}
  </Link>
);

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Accordion submenus states for sidebar
  const [registrationsOpen, setRegistrationsOpen] = useState(false);
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [leadsMenuOpen, setLeadsMenuOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(false);

  const { user, logout } = useAuth();
  const { effectiveId: sessionKey } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const handleLogout = () => setConfirmLogout(true);
  const confirmAndLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate('/');
  };

  // Auto-expand accordions if active path is loaded
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/registrations')) {
      setRegistrationsOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/admissions')) {
      setAdmissionsOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/meta-leads') || location.pathname.startsWith('/dashboard/google-leads') || location.pathname.startsWith('/dashboard/leads/')) {
      setLeadsMenuOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/settings')) {
      setDownloadOpen(true);
    }
    if (location.pathname === '/dashboard/exams') {
      setUploadsOpen(true);
    }
    if (location.pathname.startsWith('/dashboard/website')) {
      setWebsiteOpen(true);
    }
  }, [location.pathname]);

  const isStaff = ['admin', 'manager', 'counsellor', 'accountant', 'teacher'].includes(user?.role);
  const isManager = ['admin', 'manager'].includes(user?.role);
  const canSeeExams = ['admin', 'manager', 'teacher'].includes(user?.role);

  return (
    <div className="staff-shell h-screen overflow-hidden bg-[#f5f6f8] flex">
      {/* Sidebar - Desktop */}
      <aside className={`crm-sidebar hidden md:flex relative z-20 flex-col bg-white text-slate-700 h-full shrink-0 border-r border-slate-200 transition-all duration-300 [&_.bg-ame-navy_svg]:!text-white ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 -right-3.5 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-600 shadow-md hover:bg-slate-50 cursor-pointer"
          title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
        <div className={`crm-sidebar-head h-16 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 ${isCollapsed ? 'justify-center px-2' : 'pl-6 pr-8'}`}>
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img 
              src={LogoImage} 
              alt="IIAE Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-white shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rotate-45"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4.5 19.5 3c-1.5-1.5-3-1.5-4.5.5L11.5 7 3.3 5.2c-.9-.2-1.8.3-2 1.2V7c0 .4.2.8.5 1.1L9 12l-1.5 5.5c-.2.9.3 1.8 1.2 2h.2c.4 0 .8-.2 1.1-.5l4-4h.5l3.5 3.5c.3.3.7.5 1.1.5.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1Z"/></svg></div>';
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight text-slate-900 truncate">IIAE New Delhi</h1>
              <p className="text-[11px] text-slate-500 font-bold tracking-wide uppercase">CRM Hub</p>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {user && isStaff && (
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard/stats"
                className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                  location.pathname === '/dashboard/stats'
                    ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  {!isCollapsed && <span>Dashboard Stats</span>}
                </div>
                {!isCollapsed && location.pathname === '/dashboard/stats' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </Link>

              {/* Registrations Accordion Dropdown */}
              {['admin', 'manager', 'counsellor'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setRegistrationsOpen(!registrationsOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname.startsWith('/dashboard/registrations') ? menuActive : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Registrations</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${registrationsOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && registrationsOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/registrations/paid" active={location.pathname === '/dashboard/registrations/paid'}>
                        Paid Registrations
                      </SubNavLink>
                      <SubNavLink to="/dashboard/registrations/unpaid" active={location.pathname === '/dashboard/registrations/unpaid'}>
                        Unpaid Registrations
                      </SubNavLink>
                      {user.role === 'admin' && (
                        <SubNavLink to="/dashboard/registrations/form" active={location.pathname === '/dashboard/registrations/form'}>
                          Registration Form
                        </SubNavLink>
                      )}
                      {['admin', 'manager'].includes(user.role) && (
                        <SubNavLink to="/dashboard/registrations/admit-cards" active={location.pathname === '/dashboard/registrations/admit-cards'}>
                          Admit Cards
                        </SubNavLink>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Admissions Accordion Dropdown */}
              {['admin', 'manager'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setAdmissionsOpen(!admissionsOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname.startsWith('/dashboard/admissions') ? menuActive : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Admissions</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${admissionsOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && admissionsOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/admissions/list" active={location.pathname === '/dashboard/admissions/list'}>
                        Admission List
                      </SubNavLink>
                      <SubNavLink to="/dashboard/admissions/add" active={location.pathname === '/dashboard/admissions/add'}>
                        Add Admissions
                      </SubNavLink>
                    </div>
                  )}
                </div>
              )}

              {/* Counsellors */}
              {['admin', 'manager'].includes(user.role) && (
                <Link
                  to="/dashboard/counsellors"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/counsellors'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Counsellors</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/counsellors' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Telecaller's own leads, from every source */}
              {user.role === 'counsellor' && (
                <Link
                  to="/dashboard/my-leads"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/my-leads'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Headset className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>My Leads</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/my-leads' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Leads */}
              {['admin', 'manager'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setLeadsMenuOpen(!leadsMenuOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname.startsWith('/dashboard/meta-leads') || location.pathname.startsWith('/dashboard/google-leads') || location.pathname.startsWith('/dashboard/leads/')
                        ? menuActive
                        : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Leads</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${leadsMenuOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && leadsMenuOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/leads/added" active={location.pathname === '/dashboard/leads/added'}>
                        Added & uploaded
                      </SubNavLink>
                      <SubNavLink to="/dashboard/leads/website" active={location.pathname === '/dashboard/leads/website'}>
                        Website leads
                      </SubNavLink>
                      <SubNavLink to="/dashboard/meta-leads" active={location.pathname.startsWith('/dashboard/meta-leads')}>
                        Meta Leads
                      </SubNavLink>
                      <SubNavLink to="/dashboard/google-leads" active={location.pathname.startsWith('/dashboard/google-leads')}>
                        Google Ads Leads
                      </SubNavLink>
                      {user.role === 'admin' && (
                        <SubNavLink to="/dashboard/leads/blocked" active={location.pathname === '/dashboard/leads/blocked'}>
                          Blocked Contacts
                        </SubNavLink>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Newsletters */}
              {['admin', 'manager'].includes(user.role) && (
                <Link
                  to="/dashboard/newsletters"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/newsletters'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Newsletters</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/newsletters' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Integrations */}
              {['admin', 'manager'].includes(user.role) && (
                <Link
                  to="/dashboard/integrations/meta"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname.startsWith('/dashboard/integrations')
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Plug className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Integrations</span>}
                  </div>
                  {!isCollapsed && location.pathname.startsWith('/dashboard/integrations') && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Sessions (admin) */}
              {user.role === 'admin' && (
                <Link
                  to="/dashboard/sessions"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/sessions'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarRange className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Sessions</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/sessions' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Website content: blog and newsroom posts, faculty, SEO */}
              {['admin', 'manager'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setWebsiteOpen(!websiteOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname.startsWith('/dashboard/website') ? menuActive : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                    title={isCollapsed ? 'Website' : ''}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Website</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${websiteOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && websiteOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/website/blog" active={location.pathname === '/dashboard/website/blog'}>
                        Blog Posts
                      </SubNavLink>
                      <SubNavLink to="/dashboard/website/newsroom" active={location.pathname === '/dashboard/website/newsroom'}>
                        Newsroom
                      </SubNavLink>
                      {user.role === 'admin' && (
                        <>
                          <SubNavLink to="/dashboard/website/faculty" active={location.pathname === '/dashboard/website/faculty'}>
                            Faculty
                          </SubNavLink>
                          <SubNavLink to="/dashboard/website/seo" active={location.pathname === '/dashboard/website/seo'}>
                            SEO
                          </SubNavLink>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Download Settings Toggles Accordion */}
              {['admin', 'manager'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setDownloadOpen(!downloadOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname.startsWith('/dashboard/settings') ? menuActive : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Download Settings</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${downloadOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && downloadOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'}>
                        Admit Card On/Off
                      </SubNavLink>
                      <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'}>
                        Result On/Off
                      </SubNavLink>
                      <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'}>
                        Counselling Letter On/Off
                      </SubNavLink>
                    </div>
                  )}
                </div>
              )}

              {/* Uploads Accordion */}
              {['admin', 'manager', 'teacher'].includes(user.role) && (
                <div>
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      setUploadsOpen(!uploadsOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-sm text-sm font-semibold transition-all cursor-pointer ${
                      location.pathname === '/dashboard/exams' ? menuActive : menuIdle
                    } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <UploadCloud className="w-4 h-4 text-slate-500" />
                      {!isCollapsed && <span>Uploads</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${uploadsOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!isCollapsed && uploadsOpen && (
                    <div className="mt-1.5 space-y-0.5 pl-4">
                      <SubNavLink to="/dashboard/exams" active={location.pathname === '/dashboard/exams'}>
                        Results
                      </SubNavLink>
                      <SubNavLink to="/dashboard/exams" active={location.pathname === '/dashboard/exams'}>
                        Exam Dates
                      </SubNavLink>
                    </div>
                  )}
                </div>
              )}

              {/* User Admin specific details */}
              {user.role === 'admin' && (
                <Link
                  to="/dashboard/users"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/users'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>User Management</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/users' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Course Catalog */}
              {['admin', 'manager'].includes(user.role) && (
                <Link
                  to="/dashboard/courses"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/courses'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Course Catalog</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/courses' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Batches Allocation */}
              {['admin', 'manager'].includes(user.role) && (
                <Link
                  to="/dashboard/batches"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/batches'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Batch Allocation</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/batches' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Fee collection */}
              {['admin', 'accountant'].includes(user.role) && (
                <Link
                  to="/dashboard/payments"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/payments'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                >
                  <div className="flex items-center gap-3">
                    <IndianRupee className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Fees & Payments</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/payments' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* PayU online payments and payment links */}
              {['admin', 'accountant'].includes(user.role) && (
                <Link
                  to="/dashboard/payments/online"
                  className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                    location.pathname === '/dashboard/payments/online'
                      ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
                  title={isCollapsed ? 'Online Payments' : ''}
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="w-4 h-4 text-slate-500" />
                    {!isCollapsed && <span>Online Payments</span>}
                  </div>
                  {!isCollapsed && location.pathname === '/dashboard/payments/online' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </Link>
              )}

              {/* Announcements notices */}
              <Link
                to="/dashboard/announcements"
                className={`flex items-center rounded-sm text-sm font-semibold transition-all ${
                  location.pathname === '/dashboard/announcements'
                    ? 'bg-ame-navy text-white border-l-4 border-ame-orange rounded-l-none'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'}`}
              >
                <div className="flex items-center gap-3">
                  <BellRing className="w-4 h-4 text-slate-500" />
                  {!isCollapsed && <span>Announcements</span>}
                </div>
                {!isCollapsed && location.pathname === '/dashboard/announcements' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </Link>
            </>
          )}

        </nav>

        <AccountMenu user={user} collapsed={isCollapsed} onLogout={handleLogout} />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/40 backdrop-blur-sm">
          <div className="crm-sidebar w-64 bg-white text-slate-800 flex flex-col h-full animate-slide-in border-r border-slate-200">
            <div className="crm-sidebar-head h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <img 
                    src={LogoImage} 
                    alt="IIAE Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-semibold text-sm text-slate-900">IIAE CRM</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-900 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
              {user && isStaff && (
                <>
                  <Link
                    to="/dashboard/stats"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                      location.pathname === '/dashboard/stats' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-500" />
                    <span>Dashboard Stats</span>
                  </Link>

                  {isManager && (
                  <>
                  {/* Registrations */}
                  <div>
                    <button
                      onClick={() => setRegistrationsOpen(!registrationsOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                        location.pathname.startsWith('/dashboard/registrations') ? menuActive : menuIdle
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-4 h-4 text-slate-500" />
                        <span>Registrations</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${registrationsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {registrationsOpen && (
                      <div className="mt-1.5 space-y-0.5 pl-4">
                        <SubNavLink to="/dashboard/registrations/paid" active={location.pathname === '/dashboard/registrations/paid'} onClick={() => setSidebarOpen(false)}>
                          Paid Registrations
                        </SubNavLink>
                        <SubNavLink to="/dashboard/registrations/unpaid" active={location.pathname === '/dashboard/registrations/unpaid'} onClick={() => setSidebarOpen(false)}>
                          Unpaid Registrations
                        </SubNavLink>
                        {user.role === 'admin' && (
                          <SubNavLink to="/dashboard/registrations/form" active={location.pathname === '/dashboard/registrations/form'} onClick={() => setSidebarOpen(false)}>
                            Registration Form
                          </SubNavLink>
                        )}
                        {['admin', 'manager'].includes(user.role) && (
                          <SubNavLink to="/dashboard/registrations/admit-cards" active={location.pathname === '/dashboard/registrations/admit-cards'} onClick={() => setSidebarOpen(false)}>
                            Admit Cards
                          </SubNavLink>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admissions */}
                  <div>
                    <button
                      onClick={() => setAdmissionsOpen(!admissionsOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                        location.pathname.startsWith('/dashboard/admissions') ? menuActive : menuIdle
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-4 h-4 text-slate-500" />
                        <span>Admissions</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${admissionsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {admissionsOpen && (
                      <div className="mt-1.5 space-y-0.5 pl-4">
                        <SubNavLink to="/dashboard/admissions/list" active={location.pathname === '/dashboard/admissions/list'} onClick={() => setSidebarOpen(false)}>
                          Admission List
                        </SubNavLink>
                        <SubNavLink to="/dashboard/admissions/add" active={location.pathname === '/dashboard/admissions/add'} onClick={() => setSidebarOpen(false)}>
                          Add Admissions
                        </SubNavLink>
                      </div>
                    )}
                  </div>

                  {/* Counsellors */}
                  <Link
                    to="/dashboard/counsellors"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                      location.pathname === '/dashboard/counsellors' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Counsellors</span>
                  </Link>
                  </>
                  )}

                  {/* Counsellor's own leads */}
                  {user.role === 'counsellor' && (
                    <>
                    <Link
                      to="/dashboard/registrations/unpaid"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                        location.pathname.startsWith('/dashboard/registrations') ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4 text-slate-500" />
                      <span>Registrations</span>
                    </Link>
                    <Link
                      to="/dashboard/my-leads"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                        location.pathname === '/dashboard/my-leads' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Headset className="w-4 h-4 text-slate-500" />
                      <span>My Leads</span>
                    </Link>
                    </>
                  )}

                  {['admin', 'manager'].includes(user.role) && (
                    <div>
                      <button
                        onClick={() => setLeadsMenuOpen(!leadsMenuOpen)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                          location.pathname.startsWith('/dashboard/meta-leads') || location.pathname.startsWith('/dashboard/google-leads') || location.pathname.startsWith('/dashboard/leads/')
                            ? menuActive
                            : menuIdle
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Megaphone className="w-4 h-4 text-slate-500" />
                          <span>Leads</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${leadsMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {leadsMenuOpen && (
                        <div className="mt-1.5 space-y-0.5 pl-4">
                          <SubNavLink to="/dashboard/leads/added" active={location.pathname === '/dashboard/leads/added'} onClick={() => setSidebarOpen(false)}>
                            Added & uploaded
                          </SubNavLink>
                          <SubNavLink to="/dashboard/leads/website" active={location.pathname === '/dashboard/leads/website'} onClick={() => setSidebarOpen(false)}>
                            Website leads
                          </SubNavLink>
                          <SubNavLink to="/dashboard/meta-leads" active={location.pathname.startsWith('/dashboard/meta-leads')} onClick={() => setSidebarOpen(false)}>
                            Meta Leads
                          </SubNavLink>
                          <SubNavLink to="/dashboard/google-leads" active={location.pathname.startsWith('/dashboard/google-leads')}>
                            Google Ads Leads
                          </SubNavLink>
                          {user.role === 'admin' && (
                            <SubNavLink to="/dashboard/leads/blocked" active={location.pathname === '/dashboard/leads/blocked'} onClick={() => setSidebarOpen(false)}>
                              Blocked Contacts
                            </SubNavLink>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isManager && (
                  <Link
                    to="/dashboard/newsletters"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                      location.pathname === '/dashboard/newsletters' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>Newsletters</span>
                  </Link>
                  )}

                  {/* Fees and online payments */}
                  {['admin', 'accountant'].includes(user.role) && (
                    <>
                      <Link
                        to="/dashboard/payments"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                          location.pathname === '/dashboard/payments' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <IndianRupee className="w-4 h-4 text-slate-500" />
                        <span>Fees &amp; Payments</span>
                      </Link>
                      <Link
                        to="/dashboard/payments/online"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                          location.pathname === '/dashboard/payments/online' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="w-4 h-4 text-slate-500" />
                        <span>Online Payments</span>
                      </Link>
                    </>
                  )}

                  {/* Integrations */}
                  {['admin', 'manager'].includes(user.role) && (
                    <Link
                      to="/dashboard/integrations/meta"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                        location.pathname.startsWith('/dashboard/integrations') ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Plug className="w-4 h-4 text-slate-500" />
                      <span>Integrations</span>
                    </Link>
                  )}

                  {user.role === 'admin' && (
                    <Link
                      to="/dashboard/sessions"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                        location.pathname === '/dashboard/sessions' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4 text-slate-500" />
                      <span>Sessions</span>
                    </Link>
                  )}

                  {isManager && (
                  <div>
                    <button
                      onClick={() => setWebsiteOpen(!websiteOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                        location.pathname.startsWith('/dashboard/website') ? menuActive : menuIdle
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span>Website</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${websiteOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {websiteOpen && (
                      <div className="mt-1.5 space-y-0.5 pl-4">
                        <SubNavLink to="/dashboard/website/blog" active={location.pathname === '/dashboard/website/blog'} onClick={() => setSidebarOpen(false)}>
                          Blog Posts
                        </SubNavLink>
                        <SubNavLink to="/dashboard/website/newsroom" active={location.pathname === '/dashboard/website/newsroom'} onClick={() => setSidebarOpen(false)}>
                          Newsroom
                        </SubNavLink>
                        {user.role === 'admin' && (
                          <>
                            <SubNavLink to="/dashboard/website/faculty" active={location.pathname === '/dashboard/website/faculty'} onClick={() => setSidebarOpen(false)}>
                              Faculty
                            </SubNavLink>
                            <SubNavLink to="/dashboard/website/seo" active={location.pathname === '/dashboard/website/seo'} onClick={() => setSidebarOpen(false)}>
                              SEO
                            </SubNavLink>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  )}

                  {isManager && (
                  <div>
                    <button
                      onClick={() => setDownloadOpen(!downloadOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                        location.pathname.startsWith('/dashboard/settings') ? menuActive : menuIdle
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Download Switch</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${downloadOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {downloadOpen && (
                      <div className="mt-1.5 space-y-0.5 pl-4">
                        <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'} onClick={() => setSidebarOpen(false)}>
                          Admit Card On/Off
                        </SubNavLink>
                        <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'} onClick={() => setSidebarOpen(false)}>
                          Result On/Off
                        </SubNavLink>
                        <SubNavLink to="/dashboard/settings/downloads" active={location.pathname === '/dashboard/settings/downloads'} onClick={() => setSidebarOpen(false)}>
                          Counselling Letter On/Off
                        </SubNavLink>
                      </div>
                    )}
                  </div>
                  )}

                  {canSeeExams && (
                  <div>
                    <button
                      onClick={() => setUploadsOpen(!uploadsOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-semibold cursor-pointer ${
                        location.pathname === '/dashboard/exams' ? menuActive : menuIdle
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UploadCloud className="w-4 h-4 text-slate-500" />
                        <span>Uploads</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${uploadsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {uploadsOpen && (
                      <div className="mt-1.5 space-y-0.5 pl-4">
                        <SubNavLink to="/dashboard/exams" active={location.pathname === '/dashboard/exams'} onClick={() => setSidebarOpen(false)}>
                          Results
                        </SubNavLink>
                        <SubNavLink to="/dashboard/exams" active={location.pathname === '/dashboard/exams'} onClick={() => setSidebarOpen(false)}>
                          Exam Dates
                        </SubNavLink>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Announcements */}
                  <Link
                    to="/dashboard/announcements"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold ${
                      location.pathname === '/dashboard/announcements' ? 'bg-slate-100 text-ame-navy' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <BellRing className="w-4 h-4 text-slate-500" />
                    <span>Announcements</span>
                  </Link>
                </>
              )}

            </nav>

            <AccountMenu user={user} onLogout={handleLogout} />
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)}></div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden absolute top-3 left-3 z-20 p-2 bg-white border border-slate-200 shadow-sm rounded-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Notifications: floating bell, top right */}
        {isStaff && (
          <div className="absolute top-3 right-3 md:top-4 md:right-6 z-30 bg-white border border-slate-200 shadow-sm rounded-sm">
            <NotificationBell />
          </div>
        )}

        {/* Content Viewport (extra top space on desktop keeps page headers clear of the bell) */}
        <main className="flex-1 overflow-y-auto px-3 pt-14 pb-4 md:px-6 md:pb-6 md:pt-16 bg-[#f5f6f8]">
          <div key={sessionKey} className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
      {isStaff && <WhileYouWereAway userId={user?._id || user?.id} />}
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

export default DashboardLayout;
