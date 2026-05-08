import { withRetry, TimeoutError } from './retry';

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const r = await withRetry(fn, () => true, {
      attempts: 3,
      backoffMs: 1,
      timeoutMs: 1000,
    });
    expect(r).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient errors up to attempts', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok');
    const r = await withRetry(fn, () => true, {
      attempts: 3,
      backoffMs: 1,
      timeoutMs: 1000,
    });
    expect(r).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws RetryExhaustedError after all attempts fail', async () => {
    const err = new Error('boom');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, () => true, { attempts: 2, backoffMs: 1, timeoutMs: 1000 }),
    ).rejects.toMatchObject({
      name: 'RetryExhaustedError',
      cause: err,
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry when error is classified as non-transient', async () => {
    const err = new Error('permanent');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, () => false, {
        attempts: 3,
        backoffMs: 1,
        timeoutMs: 1000,
      }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('enforces the hard timeout', async () => {
    const fn = () =>
      new Promise((resolve) => setTimeout(() => resolve('late'), 200));
    await expect(
      withRetry(fn, () => true, { attempts: 1, backoffMs: 1, timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });
});
