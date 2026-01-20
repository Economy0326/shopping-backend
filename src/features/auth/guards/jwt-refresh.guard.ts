import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {
  handleRequest(err: any, user: any, info: any) {
    // Strategy에서 UnauthorizedException 던지면 err로 들어옴
    if (err) {
      // 혹시 다른 계층에서 이상한 에러가 섞여도 refresh는 401로 통일
      throw err instanceof UnauthorizedException ? err : new UnauthorizedException();
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}