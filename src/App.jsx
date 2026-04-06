import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { StudentDashboard } from './pages/student/StudentDashboard'
import { ApplyLeavePage } from './pages/student/ApplyLeavePage'
import { StudentAnalyticsPage } from './pages/student/StudentAnalyticsPage'
import { TeacherDashboard } from './pages/teacher/TeacherDashboard'
import { TeacherAnalyticsPage } from './pages/teacher/TeacherAnalyticsPage'
import { AdminPanel } from './pages/admin/AdminPanel'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'
import { AdminCalendarPage } from './pages/admin/AdminCalendarPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'student') return <Navigate to="/student" replace />
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/apply"
        element={
          <ProtectedRoute roles={['student']}>
            <ApplyLeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/analytics"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/analytics"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
