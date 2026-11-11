import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardStats from './pages/DashboardStats';
import UserManagementPage from './pages/UserManagementPage';
import CourseCatalogPage from './pages/CourseCatalogPage';
import BatchAllocationsPage from './pages/BatchAllocationsPage';
import InboxLeadsPage from './pages/InboxLeadsPage';
import TeacherBatchesPage from './pages/TeacherBatchesPage';
import ExamsGradingPage from './pages/ExamsGradingPage';
import PaymentsFeesPage from './pages/PaymentsFeesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';

// New Reference Pages
import RegistrationsPage from './pages/RegistrationsPage';
import StudentRegistrationDetailPage from './pages/StudentRegistrationDetailPage';
import AdmissionsPage from './pages/AdmissionsPage';
import NewslettersPage from './pages/NewslettersPage';
import DownloadSettingsPage from './pages/DownloadSettingsPage';
import SessionsPage from './pages/SessionsPage';

// Meta Lead Ads integration
import MetaIntegrationPage from './pages/MetaIntegrationPage';
import MetaLeadsPage from './pages/MetaLeadsPage';
import GoogleLeadsPage from './pages/GoogleLeadsPage';
import MetaLeadReportPage from './pages/MetaLeadReportPage';
import CounsellorTasksPage from './pages/CounsellorTasksPage';
import MyMetaLeadsPage from './pages/MyMetaLeadsPage';
import RegistrationWindowPage from './pages/RegistrationWindowPage';
import AdmitCardsPage from './pages/AdmitCardsPage';
import BlockedContactsPage from './pages/BlockedContactsPage';
import OnlinePaymentsPage from './pages/OnlinePaymentsPage';
// Public website content (blog and newsroom posts)
import WebsitePostsPage from './pages/WebsitePostsPage';
import FacultyPage from './pages/FacultyPage';
import SeoPage from './pages/SeoPage';
import NotificationsPage from './pages/NotificationsPage';

const WEBSITE_URL = String(import.meta.env.VITE_WEBSITE_URL || 'https://iiae.in').replace(/\/+$/, '');

// Student registration, login and the student dashboard live on the public website.
const ToWebsite = ({ path }) => {
  const location = useLocation();
  const target = `${WEBSITE_URL}${path || location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-sm font-semibold text-slate-600">
      Opening the student website…
    </div>
  );
};

const returnedFromMissing = new Set();

// A removed CRM address stays in this app. If the person came from another page, send
// them back there. A direct visit shows page not found.
const MissingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasPrevious = (window.history.state?.idx ?? 0) > 0;

  useEffect(() => {
    if (!hasPrevious || returnedFromMissing.has(location.key)) return;
    returnedFromMissing.add(location.key);
    navigate(-1);
  }, [hasPrevious, location.key, navigate]);

  if (hasPrevious) return null;

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">This address is not part of the CRM.</p>
      <a href="/" className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
        Go to login
      </a>
    </div>
  );
};

const LegacyLoginRedirect = () => {
  const [params] = useSearchParams();
  const search = params.toString();
  return <Navigate to={search ? `/?${search}` : '/'} replace />;
};

// Route wrapper enforcing authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role === 'student') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Route wrapper restricting access to specific roles
const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/stats" replace />;
  }

  return children;
};

const LeadsIndexRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'counsellor') return <Navigate to="/dashboard/my-leads" replace />;
  return <Navigate to="/dashboard/leads/added" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '12px 18px',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid #1e293b'
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LegacyLoginRedirect />} />
          <Route path="/apply-now" element={<MissingPage />} />
          <Route path="/apply" element={<MissingPage />} />
          <Route path="/register/:token" element={<ToWebsite />} />
          <Route path="/payment/:reference" element={<ToWebsite />} />
          <Route path="/pay/registration/:token" element={<ToWebsite />} />
          <Route path="/dashboard/student/*" element={<ToWebsite />} />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    {/* Common Stats */}
                    <Route path="stats" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor', 'accountant', 'teacher']}>
                        <DashboardStats />
                      </RoleRoute>
                    } />

                    {/* Admin Dashboard views */}
                    <Route path="users" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <UserManagementPage />
                      </RoleRoute>
                    } />

                    {/* Course/Batch setups */}
                    <Route path="courses" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <CourseCatalogPage />
                      </RoleRoute>
                    } />
                    <Route path="batches" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <BatchAllocationsPage />
                      </RoleRoute>
                    } />

                    <Route path="leads" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor']}>
                        <LeadsIndexRedirect />
                      </RoleRoute>
                    } />
                    <Route path="leads/uploaded" element={<Navigate to="/dashboard/leads/added" replace />} />
                    <Route path="leads/added" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <InboxLeadsPage key="manual" kind="manual" />
                      </RoleRoute>
                    } />
                    <Route path="leads/blocked" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <BlockedContactsPage />
                      </RoleRoute>
                    } />
                    <Route path="leads/website" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <InboxLeadsPage key="website" kind="website" />
                      </RoleRoute>
                    } />

                    {/* Registrations menu dropdown paths */}
                    <Route path="registrations/paid" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor']}>
                        <RegistrationsPage />
                      </RoleRoute>
                    } />
                    <Route path="registrations/unpaid" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor']}>
                        <RegistrationsPage />
                      </RoleRoute>
                    } />
                    <Route path="registrations/student/:id" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor']}>
                        <StudentRegistrationDetailPage />
                      </RoleRoute>
                    } />
                    <Route path="registrations/form" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <RegistrationWindowPage />
                      </RoleRoute>
                    } />
                    <Route path="registrations/admit-cards" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <AdmitCardsPage />
                      </RoleRoute>
                    } />

                    {/* Admissions menu dropdown paths */}
                    <Route path="admissions/list" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <AdmissionsPage />
                      </RoleRoute>
                    } />
                    <Route path="admissions/add" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <AdmissionsPage />
                      </RoleRoute>
                    } />

                    {/* Counsellors Performance list */}
                    <Route path="counsellors" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <MetaLeadReportPage />
                      </RoleRoute>
                    } />

                    {/* Public website content: blog and newsroom posts shown on iiae.in */}
                    <Route path="website" element={<Navigate to="/dashboard/website/blog" replace />} />
                    <Route path="website/blog" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <WebsitePostsPage key="blog" kind="blog" />
                      </RoleRoute>
                    } />
                    <Route path="website/newsroom" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <WebsitePostsPage key="newsroom" kind="newsroom" />
                      </RoleRoute>
                    } />
                    <Route path="website/faculty" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <FacultyPage />
                      </RoleRoute>
                    } />
                    <Route path="website/seo" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <SeoPage />
                      </RoleRoute>
                    } />

                    {/* In-app notifications for every staff role */}
                    <Route path="notifications" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'counsellor', 'accountant', 'teacher']}>
                        <NotificationsPage />
                      </RoleRoute>
                    } />

                    {/* Newsletter campaigns */}
                    <Route path="newsletters" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <NewslettersPage />
                      </RoleRoute>
                    } />

                    {/* Admission sessions: named date ranges that scope every list */}
                    <Route path="sessions" element={
                      <RoleRoute allowedRoles={['admin']}>
                        <SessionsPage />
                      </RoleRoute>
                    } />

                    {/* Global Download Settings (Admit Card, Results, Counselling letter toggles) */}
                    <Route path="settings/downloads" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <DownloadSettingsPage />
                      </RoleRoute>
                    } />

                    {/* Meta Lead Ads integration and collected leads */}
                    <Route path="integrations/meta" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <MetaIntegrationPage />
                      </RoleRoute>
                    } />
                    <Route path="meta-leads" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <MetaLeadsPage />
                      </RoleRoute>
                    } />
                    <Route path="google-leads" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <GoogleLeadsPage />
                      </RoleRoute>
                    } />
                    <Route path="meta-leads/report/:counsellorId" element={
                      <RoleRoute allowedRoles={['admin', 'manager']}>
                        <CounsellorTasksPage />
                      </RoleRoute>
                    } />

                    {/* Telecaller's own Meta leads */}
                    <Route path="my-leads" element={
                      <RoleRoute allowedRoles={['counsellor']}>
                        <MyMetaLeadsPage />
                      </RoleRoute>
                    } />

                    {/* Teacher specific routes */}
                    <Route path="teacher/batches" element={
                      <RoleRoute allowedRoles={['teacher']}>
                        <TeacherBatchesPage />
                      </RoleRoute>
                    } />

                    {/* Exams / Grading & Results upload */}
                    <Route path="exams" element={
                      <RoleRoute allowedRoles={['admin', 'manager', 'teacher']}>
                        <ExamsGradingPage />
                      </RoleRoute>
                    } />

                    {/* Fees / Accountant routes */}
                    <Route path="payments" element={
                      <RoleRoute allowedRoles={['admin', 'accountant']}>
                        <PaymentsFeesPage />
                      </RoleRoute>
                    } />
                    <Route path="payments/online" element={
                      <RoleRoute allowedRoles={['admin', 'accountant']}>
                        <OnlinePaymentsPage />
                      </RoleRoute>
                    } />

                    {/* Announcements notices */}
                    <Route path="announcements" element={<AnnouncementsPage />} />

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/dashboard/stats" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
