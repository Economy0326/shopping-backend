import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CurrentUser } from '../../../shared/current-user';

@Injectable()
export class OptionalJwtAccessGuard extends AuthGuard('jwt-access') {
  handleRequest<TUser = CurrentUser | null>(
    err: unknown,
    user: TUser | false | null,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }

    return user;
  }
}
