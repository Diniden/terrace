import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApplicationRole } from '../../../entities/user.entity';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsEnum(ApplicationRole)
  @IsOptional()
  applicationRole?: ApplicationRole;
}
