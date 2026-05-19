import { HttpException, BadRequestException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(method: string, originalUrl: string) {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = { status, json };
  const request = { method, originalUrl };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs and returns 500 for a non-HttpException Error', () => {
    const { host, status, json } = makeHost('POST', '/bills/parse-photo');
    const err = new Error('something exploded');

    filter.catch(err, host);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '[POST /bills/parse-photo] something exploded',
      err.stack,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('logs with coerced message and no stack for a non-Error thrown value', () => {
    const { host, status, json } = makeHost('GET', '/users/me');

    filter.catch('oops', host);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '[GET /users/me] oops',
      undefined,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('passes HttpException with string response through without logging', () => {
    const { host, status, json } = makeHost('GET', '/protected');
    const err = new HttpException('Forbidden', 403);

    filter.catch(err, host);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'Forbidden',
    });
  });

  it('passes HttpException with object response through without logging', () => {
    const { host, status, json } = makeHost('POST', '/auth/login');
    const err = new BadRequestException({
      statusCode: 400,
      message: 'Bad input',
      error: 'Bad Request',
    });

    filter.catch(err, host);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Bad input',
      error: 'Bad Request',
    });
  });
});
