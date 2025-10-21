import { apiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, ProfileResponse } from '../types';

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    apiClient.setToken(response.accessToken);
    return response;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    apiClient.setToken(response.accessToken);
    return response;
  },

  async getProfile(): Promise<ProfileResponse> {
    return await apiClient.get<ProfileResponse>('/auth/profile');
  },

  logout() {
    apiClient.setToken(null);
  },
};
