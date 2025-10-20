import { Exclude, Expose } from 'class-transformer';
import { ApplicationRole } from '../../../entities/user.entity';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  applicationRole: ApplicationRole;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Password is excluded by default (not decorated with @Expose())
}
