import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

/** App shell with a top navigation bar shown on all protected pages. */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            SimpleInvoice
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user?.fullname}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
