import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

type ResponsePayload<T> =
  | {
      data: T;
      meta?: unknown;
    }
  | T;

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ResponsePayload<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponsePayload<T>> {
    return next.handle().pipe(
      map((payload: T) => {
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return payload as ResponsePayload<T>;
        }

        return { data: payload };
      }),
    );
  }
}
