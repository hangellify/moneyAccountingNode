import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === 'string'
          ? { statusCode: status, message: response }
          : response;
      res.status(status).json(body);
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(`[${req.method} ${req.originalUrl}] ${message}`, stack);

    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
}
