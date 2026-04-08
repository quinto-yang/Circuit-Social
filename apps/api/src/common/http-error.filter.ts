import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const errorCode =
        typeof payload === "object" && payload !== null && "code" in payload
          ? String((payload as { code?: unknown }).code ?? "")
          : null;
      const error =
        typeof payload === "string"
          ? payload
          : typeof payload === "object" &&
              payload !== null &&
              "message" in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : String(payload.message)
            : exception.message;
      response.status(status).json({
        ok: false,
        error,
        ...(errorCode ? { errorCode } : {})
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      ok: false,
      error: exception instanceof Error ? exception.message : "请求失败"
    });
  }
}
