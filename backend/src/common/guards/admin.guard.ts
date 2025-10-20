import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ApplicationRole } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.applicationRole !== ApplicationRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
