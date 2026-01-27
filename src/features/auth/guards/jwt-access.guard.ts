import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAccessGuard extends AuthGuard("jwt-access") {
  handleRequest(err: any, user: any, info: any) {
    // ✅ 여기서 passport-jwt가 왜 실패했는지 다 들어옴
    if (err || info || !user) {
      console.error("[jwt-access] err:", err);
      console.error("[jwt-access] info:", info); // <- TokenExpiredError, JsonWebTokenError 등
      console.error("[jwt-access] user:", user);
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
