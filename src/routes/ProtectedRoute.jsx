import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * @param {{ children: React.ReactNode; roles: Array<'student' | 'teacher' | 'admin'> }} props
 */
export function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}
