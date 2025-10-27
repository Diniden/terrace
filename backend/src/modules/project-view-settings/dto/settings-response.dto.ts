export class SettingsResponseDto {
  id: string;
  userId: string;
  projectId: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
