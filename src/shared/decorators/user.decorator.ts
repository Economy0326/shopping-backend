import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../current-user';

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);
