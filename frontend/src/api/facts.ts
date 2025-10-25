import { apiClient } from './client';
import type { Fact, FactState, FactContext, PaginatedResponse } from '../types';

export const factsApi = {
  async getAll(corpusId?: string, page = 1, limit = 1000): Promise<PaginatedResponse<Fact>> {
    const url = corpusId
      ? `/facts?corpusId=${corpusId}&page=${page}&limit=${limit}`
      : `/facts?page=${page}&limit=${limit}`;
    return apiClient.get<PaginatedResponse<Fact>>(url);
  },

  async getOne(id: string): Promise<Fact> {
    return apiClient.get<Fact>(`/facts/${id}`);
  },

  async getOneWithRelationships(id: string): Promise<Fact> {
    return apiClient.get<Fact>(`/facts/${id}/relationships`);
  },

  async create(data: {
    statement?: string;
    corpusId: string;
    basisId?: string;
    state?: FactState;
    context?: FactContext;
    meta?: Record<string, any>;
  }): Promise<Fact> {
    return apiClient.post<Fact>('/facts', data);
  },

  async update(id: string, data: {
    statement?: string;
    corpusId?: string;
    basisId?: string;
    state?: FactState;
    meta?: Record<string, any>;
  }): Promise<Fact> {
    return apiClient.patch<Fact>(`/facts/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/facts/${id}`);
  },

  async addSupport(factId: string, supportFactId: string): Promise<Fact> {
    return apiClient.post<Fact>(`/facts/${factId}/support`, { supportFactId });
  },

  async removeSupport(factId: string, supportFactId: string): Promise<Fact> {
    return apiClient.delete<Fact>(`/facts/${factId}/support/${supportFactId}`);
  },
};
