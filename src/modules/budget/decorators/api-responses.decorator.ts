import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { BudgetResponseDto } from '../dto/budget-response.dto';

/**
 * Common API responses used across budget endpoints
 */
export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  });

export const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'Budget not found',
  });

export const ApiBadRequestResponse = (description?: string) =>
  ApiResponse({
    status: 400,
    description: description || 'Bad request - Invalid input',
  });

/**
 * Combined decorators for specific endpoints
 */
export const ApiCreateBudgetResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 201,
      description: 'Budget created successfully',
      type: BudgetResponseDto,
    }),
    ApiBadRequestResponse(
      'Bad request - Budget name already exists for this user or invalid input',
    ),
    ApiUnauthorizedResponse(),
  );

export const ApiGetBudgetResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Budget retrieved successfully',
      type: BudgetResponseDto,
    }),
    ApiNotFoundResponse(),
    ApiUnauthorizedResponse(),
  );

export const ApiUpdateBudgetResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Budget updated successfully',
      type: BudgetResponseDto,
    }),
    ApiNotFoundResponse(),
    ApiBadRequestResponse('Bad request - Invalid input'),
    ApiUnauthorizedResponse(),
  );

export const ApiDeleteBudgetResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 204,
      description: 'Budget soft deleted successfully',
    }),
    ApiNotFoundResponse(),
    ApiBadRequestResponse('Bad request - Budget already deleted'),
    ApiUnauthorizedResponse(),
  );
