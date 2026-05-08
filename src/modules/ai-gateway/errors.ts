export class AiGatewayExhaustedError extends Error {
  constructor(
    public readonly parentId: string,
    public readonly lastError: unknown,
  ) {
    super(`AI gateway exhausted all providers for request ${parentId}`);
    this.name = 'AiGatewayExhaustedError';
  }
}

export class NoCapableProviderError extends Error {
  constructor(public readonly taskName: string) {
    super(
      `No configured provider supports the capabilities required by task '${taskName}'`,
    );
    this.name = 'NoCapableProviderError';
  }
}
