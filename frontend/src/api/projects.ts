import { apiClient } from './client';
import type { Project, PaginatedResponse } from '../types';

export const projectsApi = {
  async getAll(page = 1, limit = 100): Promise<PaginatedResponse<Project>> {
    return apiClient.get<PaginatedResponse<Project>>(`/projects?page=${page}&limit=${limit}`);
  },

  async getOne(id: string): Promise<Project> {
    return apiClient.get<Project>(`/projects/${id}`);
  },

  async create(data: { name: string; description?: string }): Promise<Project> {
    return apiClient.post<Project>('/projects', data);
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<Project> {
    return apiClient.patch<Project>(`/projects/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/projects/${id}`);
  },
};
