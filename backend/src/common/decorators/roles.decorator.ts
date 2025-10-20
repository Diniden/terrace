import { SetMetadata } from '@nestjs/common';
import { ApplicationRole } from '../../entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ApplicationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
