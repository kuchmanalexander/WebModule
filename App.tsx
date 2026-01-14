import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { LogoutPage } from './pages/LogoutPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { TestDetailsPage } from './pages/TestDetailsPage';
import { AttemptPage } from './pages/AttemptPage';
import { AttemptResultPage } from './pages/AttemptResultPage';
import { RequireAuth } from './router/RequireAuth';
import RequirePermission from './router/RequirePermission';
import UiOverlays from './components/UiOverlays';
import { NotFoundPage } from './pages/NotFoundPage';

import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminTestsPage } from './pages/admin/AdminTestsPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminAttemptsPage } from './pages/admin/AdminAttemptsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <UiOverlays />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Task-flow обязательные URL */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />

        {/* Защищённые страницы ("любой другой URL" в flow) */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Admin tools (вынесено отдельно, чтобы не засорять основную часть) */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminHomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <RequirePermission permission="user:list:read">
                <AdminUsersPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <RequireAuth>
              <RequirePermission permission="course:add">
                <AdminCoursesPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/tests"
          element={
            <RequireAuth>
              <RequirePermission permission="course:test:add">
                <AdminTestsPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <RequireAuth>
              <RequirePermission permission="quest:list:read">
                <AdminQuestionsPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/attempts"
          element={
            <RequireAuth>
              <RequirePermission permission="test:answer:read">
                <AdminAttemptsPage />
              </RequirePermission>
            </RequireAuth>
          }
        />

        {/* Fallback */}
        
<Route
  path="/courses"
  element={
    <RequireAuth>
      <CoursesPage />
    </RequireAuth>
  }
/>
<Route
  path="/courses/:courseId"
  element={
    <RequireAuth>
      <CourseDetailsPage />
    </RequireAuth>
  }
/>
<Route
  path="/tests/:testId"
  element={
    <RequireAuth>
      <TestDetailsPage />
    </RequireAuth>
  }
/>
<Route
  path="/attempts/:attemptId"
  element={
    <RequireAuth>
      <AttemptPage />
    </RequireAuth>
  }
/>
<Route
  path="/attempts/:attemptId/result"
  element={
    <RequireAuth>
      <AttemptResultPage />
    </RequireAuth>
  }
/>
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
