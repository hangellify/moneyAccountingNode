import { AiGatewayExhaustedFilter } from './ai-gateway-exhausted.filter';
import { AiGatewayExhaustedError } from '../../ai-gateway/errors';
import type { ArgumentsHost } from '@nestjs/common';

describe('AiGatewayExhaustedFilter', () => {
  it('maps AiGatewayExhaustedError to 502 with requestId', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const response = { status, json };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    const filter = new AiGatewayExhaustedFilter();
    const err = new AiGatewayExhaustedError(
      'req-uuid',
      new Error('all providers failed'),
    );
    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      statusCode: 502,
      message: 'AI providers exhausted',
      requestId: 'req-uuid',
    });
  });
});
