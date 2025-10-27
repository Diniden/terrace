import { apiClient } from './client';
import type { ProjectViewSettings, SaveProjectViewSettingsDto } from '../types';

export const projectViewSettingsApi = {
  async get(projectId: string): Promise<ProjectViewSettings | null> {
    try {
      return await apiClient.get<ProjectViewSettings>(`/project-view-settings/${projectId}`);
    } catch (error) {
      // Return null if settings don't exist yet (404)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async save(data: SaveProjectViewSettingsDto): Promise<ProjectViewSettings> {
    return apiClient.post<ProjectViewSettings>('/project-view-settings/upsert', data);
  },

  async delete(projectId: string): Promise<void> {
    return apiClient.delete(`/project-view-settings/${projectId}`);
  },
};
