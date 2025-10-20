import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ProjectRole } from '../../../entities/project-member.entity';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ProjectRole)
  role: ProjectRole;
}
