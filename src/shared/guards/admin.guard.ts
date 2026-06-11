import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ERR } from '../errors';
import type { RequestWithUser } from '../current-user';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException({ ...ERR.ADMIN_ONLY, details: {} });
    }

    return true;
  }
}
