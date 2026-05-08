export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  'claude-opus-4-7': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-sonnet-4-6': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku-4-5': { inputPer1M: 1.0, outputPer1M: 5.0 },
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'deepseek-chat': { inputPer1M: 0.27, outputPer1M: 1.1 },
};

export interface CostBreakdown {
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
}

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostBreakdown | null {
  const p = MODEL_PRICING[model];
  if (!p) return null;
  const inputUsd = (inputTokens * p.inputPer1M) / 1_000_000;
  const outputUsd = (outputTokens * p.outputPer1M) / 1_000_000;
  return { inputUsd, outputUsd, totalUsd: inputUsd + outputUsd };
}
