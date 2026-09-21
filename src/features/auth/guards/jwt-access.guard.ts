import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CurrentUser } from '../../../shared/current-user';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  handleRequest<TUser = CurrentUser>(
    err: unknown,
    user: TUser | false | null,
    info: unknown,
  ): TUser {
    if (err || info || !user) {
      if (err instanceof Error) {
        throw err;
      }

      throw new UnauthorizedException();
    }

    return user;
  }
}
