import { apiClient } from './client';
import type { Corpus, PaginatedResponse } from '../types';

export const corpusesApi = {
  async getAll(projectId?: string, page = 1, limit = 100): Promise<PaginatedResponse<Corpus>> {
    const url = projectId
      ? `/corpuses?projectId=${projectId}&page=${page}&limit=${limit}`
      : `/corpuses?page=${page}&limit=${limit}`;
    return apiClient.get<PaginatedResponse<Corpus>>(url);
  },

  async getOne(id: string): Promise<Corpus> {
    return apiClient.get<Corpus>(`/corpuses/${id}`);
  },

  async create(data: {
    name: string;
    description?: string;
    projectId: string;
    basisCorpusId?: string;
  }): Promise<Corpus> {
    return apiClient.post<Corpus>('/corpuses', data);
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    basisCorpusId?: string;
  }): Promise<Corpus> {
    return apiClient.patch<Corpus>(`/corpuses/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/corpuses/${id}`);
  },
};
