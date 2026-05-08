export interface RetryOptions {
  attempts: number; // total tries (including the first)
  backoffMs: number; // base delay; doubles each retry
  timeoutMs: number; // hard per-attempt timeout
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export class RetryExhaustedError extends Error {
  constructor(public override readonly cause: unknown) {
    super('All retry attempts exhausted');
    this.name = 'RetryExhaustedError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  isTransient: (err: unknown) => boolean,
  opts: RetryOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await withTimeout(fn(), opts.timeoutMs);
    } catch (err) {
      lastErr = err;
      const transient = err instanceof TimeoutError || isTransient(err);
      if (!transient) throw err;
      if (i < opts.attempts - 1) {
        await sleep(opts.backoffMs * Math.pow(2, i));
      }
    }
  }
  if (opts.attempts <= 1) {
    throw lastErr;
  }
  throw new RetryExhaustedError(lastErr);
}
