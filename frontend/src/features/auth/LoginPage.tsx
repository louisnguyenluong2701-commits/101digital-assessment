import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from './AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  // Already logged in? Skip the login screen.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setServerError(extractErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-indigo-600">SimpleInvoice</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in to continue</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
