import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => {
        // 이미 { data, meta } 형태면 그대로 반환
        if (payload && typeof payload === "object" && "data" in payload) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
