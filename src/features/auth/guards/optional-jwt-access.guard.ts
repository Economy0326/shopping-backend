import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAccessGuard extends AuthGuard("jwt-access") {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, info: any, context: any) {
    // 토큰이 없거나(Unauthorized), 만료/위조여도 throw 하지 않고 그냥 통과
    if (err) return null;
    return user ?? null;
  }
}
