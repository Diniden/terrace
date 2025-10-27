import { IsUUID, IsNotEmpty } from 'class-validator';

export class GetSettingsQueryDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;
}
