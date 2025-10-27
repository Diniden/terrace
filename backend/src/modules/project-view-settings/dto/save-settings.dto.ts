import { IsUUID, IsNotEmpty, IsObject } from 'class-validator';

export class SaveSettingsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsObject()
  @IsNotEmpty()
  settings: Record<string, any>;
}
