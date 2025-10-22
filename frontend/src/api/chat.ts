import { apiClient } from './client';
import type { ChatMessage } from '../types';

export const chatApi = {
  async getChatHistory(limit = 50, offset = 0): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(
      `/chat/history?limit=${limit}&offset=${offset}`,
    );
  },

  async createChatMessage(content: string): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>('/chat/messages', { content });
  },
};
