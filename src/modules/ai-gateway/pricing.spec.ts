import { MODEL_PRICING, computeCostUsd } from './pricing';

describe('pricing', () => {
  it('has entries for the default models named in .env.example', () => {
    expect(MODEL_PRICING['claude-sonnet-4-6']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['deepseek-chat']).toBeDefined();
  });

  it('computes cost per 1M tokens correctly', () => {
    const r = computeCostUsd('gpt-4o', 1_000_000, 1_000_000);
    expect(r).toEqual({ inputUsd: 2.5, outputUsd: 10, totalUsd: 12.5 });
  });

  it('returns null when model is not priced', () => {
    expect(computeCostUsd('unknown-model', 100, 100)).toBeNull();
  });

  it('handles zero tokens', () => {
    const r = computeCostUsd('gpt-4o', 0, 0);
    expect(r).toEqual({ inputUsd: 0, outputUsd: 0, totalUsd: 0 });
  });
});
