import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Redirects unauthenticated users to the login screen. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
