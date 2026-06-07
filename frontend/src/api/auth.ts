import { api } from './client';
import type { AuthUser, LoginResponse } from '../lib/types';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}
