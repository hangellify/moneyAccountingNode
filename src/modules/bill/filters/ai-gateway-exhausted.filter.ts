import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AiGatewayExhaustedError } from '../../ai-gateway/errors';

@Catch(AiGatewayExhaustedError)
export class AiGatewayExhaustedFilter implements ExceptionFilter<AiGatewayExhaustedError> {
  catch(exception: AiGatewayExhaustedError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(HttpStatus.BAD_GATEWAY).json({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: 'AI providers exhausted',
      requestId: exception.parentId,
    });
  }
}
