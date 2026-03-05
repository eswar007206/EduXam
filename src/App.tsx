import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import './App.css';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const ExamPracticePage = lazy(() => import('./pages/ExamPracticePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
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
const StudentReportsPage = lazy(() => import('./pages/admin/StudentReportsPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUs'));

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

function App() {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes (any authenticated user) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/exam-practice" element={<ExamPracticePage />} />

            {/* Student-only routes */}
            <Route element={<RoleGuard allowedRoles={["student"]} />}>
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/my-results" element={<MyResultsPage />} />
            </Route>

            {/* Teacher-only routes */}
            <Route element={<RoleGuard allowedRoles={["teacher"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="subjects" element={<SubjectsPage />} />
                <Route path="subjects/:id" element={<SubjectDetailPage />} />
                <Route path="subjects/:id/questions/new" element={<QuestionFormPage />} />
                <Route path="subjects/:id/questions/:qid" element={<QuestionFormPage />} />
                <Route path="import-questions" element={<ImportQuestionsPage />} />
                <Route path="submissions" element={<SubmissionsPage />} />
                <Route path="submissions/:id" element={<ReviewSubmissionPage />} />
                <Route path="reports" element={<StudentReportsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
