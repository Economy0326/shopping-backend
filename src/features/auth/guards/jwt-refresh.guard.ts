import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CurrentUser } from '../../../shared/current-user';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = CurrentUser>(
    err: unknown,
    user: TUser | false | null,
  ): TUser {
    if (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException();
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
