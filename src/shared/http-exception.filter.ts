import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorBody = {
  code?: string;
  message?: string | string[];
  details?: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '서버 오류가 발생했습니다';
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (
        responseBody &&
        typeof responseBody === 'object' &&
        !Array.isArray(responseBody)
      ) {
        const r = responseBody as ErrorBody;

        code = r.code ?? code;

        if (Array.isArray(r.message)) {
          code = 'VALIDATION_ERROR';
          message = '요청 값이 올바르지 않습니다';
          details = { errors: r.message };
        } else {
          message = r.message ?? message;
          details = r.details ?? {};
        }
      }
    } else {
      console.error('[Unhandled]', exception);
    }

    res.status(status).json({
      error: {
        code,
        message,
        details: {
          ...details,
          path: req.url,
        },
      },
    });
  }
}
