import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApplicationRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(ApplicationRole)
  applicationRole: ApplicationRole;
}
