import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { ERR } from "../errors";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== "admin") {
      throw new ForbiddenException({ ...ERR.ADMIN_ONLY, details: {} } as any);
    }
    return true;
  }
}
