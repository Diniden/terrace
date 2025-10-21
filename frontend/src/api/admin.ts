import { apiClient } from './client';

export interface ModelMetadata {
  name: string;
  displayName: string;
  fields: FieldMetadata[];
  relations: RelationMetadata[];
}

export interface FieldMetadata {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

export interface RelationMetadata {
  name: string;
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
  relatedModel: string;
}

export const adminApi = {
  getModels: (): Promise<ModelMetadata[]> => {
    return apiClient.get('/admin/models');
  },

  getModelMetadata: (modelName: string): Promise<ModelMetadata> => {
    return apiClient.get(`/admin/models/${modelName}/metadata`);
  },

  findAll: (modelName: string, filters?: Record<string, any>): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get(`/admin/models/${modelName}${query ? `?${query}` : ''}`);
  },

  findOne: (modelName: string, id: string): Promise<any> => {
    return apiClient.get(`/admin/models/${modelName}/${id}`);
  },

  create: (modelName: string, data: Record<string, any>): Promise<any> => {
    return apiClient.post(`/admin/models/${modelName}`, data);
  },

  update: (modelName: string, id: string, data: Record<string, any>): Promise<any> => {
    return apiClient.put(`/admin/models/${modelName}/${id}`, data);
  },

  delete: (modelName: string, id: string): Promise<void> => {
    return apiClient.delete(`/admin/models/${modelName}/${id}`);
  },
};
