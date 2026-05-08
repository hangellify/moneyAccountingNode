import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBadGatewayResponse,
} from '@nestjs/swagger';
import { ParsedBillResponseDto } from './parsed-bill-response.dto';

export function ApiParsePhotoResponses(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiOkResponse({ type: ParsedBillResponseDto }),
    ApiBadRequestResponse({
      description: 'Invalid file (missing, wrong MIME, or exceeds 10 MB).',
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' }),
    ApiBadGatewayResponse({
      description:
        'All AI providers failed. Response body includes requestId for audit lookup.',
    }),
  );
}
