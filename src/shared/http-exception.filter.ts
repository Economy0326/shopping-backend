import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let code = "INTERNAL_ERROR";
    let message = "서버 오류가 발생했습니다";
    let details: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r: any = exception.getResponse();

      if (r && typeof r === "object") {
        // 우리가 던진 형태: { code, message, details }
        code = r.code ?? code;

        // ValidationPipe 기본 message가 배열로 오는 경우
        if (Array.isArray(r.message)) {
          code = "VALIDATION_ERROR";
          message = "요청 값이 올바르지 않습니다";
          details = { errors: r.message };
        } else {
          message = r.message ?? message;
          details = r.details ?? {};
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.error("[Unhandled]", exception);
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