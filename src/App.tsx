import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import StudentOrganizationFeatureGuard from './components/StudentOrganizationFeatureGuard';
import { useAuth } from './context/AuthContext';
import { getAppHomePath } from '@/lib/appHome';
import './App.css';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const ExamPracticePage = lazy(() => import('./pages/ExamPracticePage'));
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage'));
const TeachersPage = lazy(() => import('./pages/student/TeachersPage'));
const MyResultsPage = lazy(() => import('./pages/student/MyResultsPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const SubjectsPage = lazy(() => import('./pages/admin/SubjectsPage'));
const SubjectDetailPage = lazy(() => import('./pages/admin/SubjectDetailPage'));
const QuestionFormPage = lazy(() => import('./pages/admin/QuestionFormPage'));
const SubmissionsPage = lazy(() => import('./pages/admin/SubmissionsPage'));
const ReviewSubmissionPage = lazy(() => import('./pages/admin/ReviewSubmissionPage'));
const ImportQuestionsPage = lazy(() => import('./pages/admin/ImportQuestionsPage'));
const SyllabusUploadPage = lazy(() => import('./pages/admin/SyllabusUploadPage'));
const StudentReportsPage = lazy(() => import('./pages/admin/StudentReportsPage'));
const ViolationsPage = lazy(() => import('./pages/admin/ViolationsPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUs'));
const RecruiterLayout = lazy(() => import('./pages/recruiter/RecruiterLayout'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));
const JobPostingsPage = lazy(() => import('./pages/recruiter/JobPostingsPage'));
const CreateJobPage = lazy(() => import('./pages/recruiter/CreateJobPage'));
const JobDetailPage = lazy(() => import('./pages/recruiter/JobDetailPage'));
const StudentDirectoryPage = lazy(() => import('./pages/recruiter/StudentDirectoryPage'));
const PlatformAdminLayout = lazy(() => import('./pages/platform-admin/PlatformAdminLayout'));
const PlatformAdminDashboardPage = lazy(() => import('./pages/platform-admin/PlatformAdminDashboardPage'));
const PlatformUniversitiesPage = lazy(() => import('./pages/platform-admin/PlatformUniversitiesPage'));
const PlatformAccountsPage = lazy(() => import('./pages/platform-admin/PlatformAccountsPage'));
const PlatformMainExamsPage = lazy(() => import('./pages/platform-admin/PlatformMainExamsPage'));
const StudentProfilePage = lazy(() => import('./pages/profile/StudentProfilePage'));
const EditProfilePage = lazy(() => import('./pages/student/EditProfilePage'));
const JobBoardPage = lazy(() => import('./pages/student/JobBoardPage'));
const JobViewPage = lazy(() => import('./pages/student/JobViewPage'));

function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <img
        src="/eduxam-logo.png"
        alt="EduXam"
        className="w-14 h-14 rounded-xl object-contain animate-pulse"
      />
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
    </div>
  );
}

function RootRoute() {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading || (isAuthenticated && !profile)) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to={getAppHomePath(profile)} replace />;
  }

  return <HomePage />;
}

function App() {
  return (
    <Router>
      {/* Hidden SVG filter for blob button goo effect – globally available */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="blob-goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/signup" element={<AuthPage initialMode="signup" />} />
          <Route
            path="/teacherauth"
            element={<AuthPage initialMode="login" allowSignup={false} portalName="Teacher Portal" />}
          />
          <Route path="/teacherauth/signup" element={<Navigate to="/teacherauth" replace />} />
          <Route
            path="/adminauth"
            element={<AuthPage initialMode="login" allowSignup={false} portalName="Admin Portal" />}
          />
          <Route path="/adminauth/signup" element={<Navigate to="/adminauth" replace />} />
          <Route
            path="/developerauth"
            element={<AuthPage initialMode="login" allowSignup={false} portalName="Developer Portal" />}
          />
          <Route
            path="/recruiterauth"
            element={<AuthPage initialMode="login" allowSignup={false} portalName="Recruiter Portal" />}
          />
          <Route path="/recruiterauth/signup" element={<Navigate to="/recruiterauth" replace />} />

          {/* Protected routes (any authenticated user) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<StudentOrganizationFeatureGuard feature="practice" fallbackTo="/main-exam" />}>
              <Route path="/exam-practice" element={<ExamPracticePage key="prep-exam-route" />} />
            </Route>
            <Route path="/main-exam" element={<ExamPracticePage key="main-exam-route" />} />
            <Route path="/profile/:studentId" element={<StudentProfilePage />} />

            {/* Student-only routes */}
            <Route element={<RoleGuard allowedRoles={["student"]} />}>
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route element={<StudentOrganizationFeatureGuard feature="find_teachers" fallbackTo="/student/dashboard" />}>
                <Route path="/teachers" element={<TeachersPage />} />
              </Route>
              <Route element={<StudentOrganizationFeatureGuard feature="my_results" fallbackTo="/student/dashboard" />}>
                <Route path="/my-results" element={<MyResultsPage />} />
              </Route>
              <Route element={<StudentOrganizationFeatureGuard feature="my_profile" fallbackTo="/student/dashboard" />}>
                <Route path="/edit-profile" element={<EditProfilePage />} />
              </Route>
              <Route element={<StudentOrganizationFeatureGuard feature="jobs" fallbackTo="/student/dashboard" />}>
                <Route path="/jobs" element={<JobBoardPage />} />
                <Route path="/jobs/:jobId" element={<JobViewPage />} />
              </Route>
            </Route>

            {/* Teacher-only routes */}
            <Route element={<RoleGuard allowedRoles={["teacher"]} />}>
              <Route path="/teacher" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="subjects" element={<SubjectsPage />} />
                <Route path="subjects/:id" element={<SubjectDetailPage />} />
                <Route path="subjects/:id/questions/new" element={<QuestionFormPage />} />
                <Route path="subjects/:id/questions/:qid" element={<QuestionFormPage />} />
                <Route path="import-questions" element={<ImportQuestionsPage />} />
                <Route path="syllabus-upload" element={<SyllabusUploadPage />} />
                <Route path="submissions" element={<SubmissionsPage />} />
                <Route path="submissions/:id" element={<ReviewSubmissionPage />} />
                <Route path="reports" element={<StudentReportsPage />} />
                <Route path="violations" element={<ViolationsPage />} />
                <Route path="students" element={<StudentDirectoryPage />} />
              </Route>
            </Route>

            {/* Admin-only routes */}
            <Route element={<RoleGuard allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<PlatformAdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PlatformAdminDashboardPage />} />
                <Route path="university" element={<PlatformUniversitiesPage />} />
                <Route path="universities" element={<Navigate to="/admin/university" replace />} />
                <Route path="accounts" element={<PlatformAccountsPage />} />
                <Route path="main-exams" element={<PlatformMainExamsPage />} />
                <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="reports" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Route>

            {/* Developer-only routes */}
            <Route element={<RoleGuard allowedRoles={["developer"]} />}>
              <Route path="/developer" element={<PlatformAdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PlatformAdminDashboardPage />} />
                <Route path="organizations" element={<PlatformUniversitiesPage />} />
                <Route path="universities" element={<Navigate to="/developer/organizations" replace />} />
                <Route path="admin-access" element={<PlatformAccountsPage />} />
                <Route path="main-exams" element={<Navigate to="/developer/dashboard" replace />} />
                <Route path="analytics" element={<Navigate to="/developer/dashboard" replace />} />
                <Route path="reports" element={<Navigate to="/developer/dashboard" replace />} />
              </Route>
            </Route>

            {/* Recruiter-only routes */}
            <Route element={<RoleGuard allowedRoles={["recruiter"]} />}>
              <Route path="/recruiter" element={<RecruiterLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<RecruiterDashboard />} />
                <Route path="jobs" element={<JobPostingsPage />} />
                <Route path="jobs/new" element={<CreateJobPage />} />
                <Route path="jobs/:jobId" element={<JobDetailPage />} />
                <Route path="students" element={<StudentDirectoryPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
