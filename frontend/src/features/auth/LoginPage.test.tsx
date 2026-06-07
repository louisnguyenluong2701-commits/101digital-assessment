import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { LoginPage } from './LoginPage';

// Mock the auth API used by AuthContext.login.
vi.mock('../../api/auth', () => ({
  login: vi.fn(),
}));
import { login as loginApi } from '../../api/auth';

function renderLogin() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Invoice List Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows validation errors when submitting an empty form', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(loginApi).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials and redirects to the invoice list', async () => {
    (loginApi as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: 'jwt-token',
      user: { id: '1', email: 'reviewer@101digital.io', fullname: 'Reviewer' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'reviewer@101digital.io');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(loginApi).toHaveBeenCalledWith('reviewer@101digital.io', 'Password123!'),
    );
    expect(await screen.findByText(/invoice list home/i)).toBeInTheDocument();
  });

  it('shows a server error message on failed login', async () => {
    (loginApi as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid email or password'));

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});
