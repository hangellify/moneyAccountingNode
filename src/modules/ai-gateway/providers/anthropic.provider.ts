import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Capability } from '../types/capability';
import { LlmProvider, ProviderName } from '../types/llm-provider';
import { LlmRequest, LlmResponse } from '../types/llm-request';
import { readOptionalKey, readModelWhenConfigured } from './provider.env';
import { withRetry } from '../internal/retry';

@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly name: ProviderName = 'anthropic';
  readonly capabilities = new Set<Capability>(['text', 'vision', 'json']);
  readonly isConfigured: boolean;
  readonly defaultModel: string;
  private readonly client?: Anthropic;

  constructor() {
    const key = readOptionalKey('ANTHROPIC_API_KEY');
    this.isConfigured = !!key;
    this.defaultModel =
      readModelWhenConfigured('ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL') ?? '';
    if (key) this.client = new Anthropic({ apiKey: key });
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!this.client) throw new Error('AnthropicProvider is not configured');
    const model = req.modelOverride ?? this.defaultModel;
    const system =
      req.messages
        .filter((m) => m.role === 'system')
        .map((m) => (m as { role: 'system'; text: string }).text)
        .join('\n') || undefined;

    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'assistant') {
          return {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: m.text }],
          };
        }
        const u = m; // role: 'user'
        const blocks: unknown[] = [];
        for (const img of u.images ?? []) {
          blocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.data.toString('base64'),
            },
          });
        }
        blocks.push({ type: 'text', text: u.text });
        return { role: 'user' as const, content: blocks };
      });

    const body: Record<string, unknown> = {
      model,
      max_tokens: req.maxOutputTokens ?? 4096,
      temperature: req.temperature ?? 0,
      system,
      messages,
    };

    if (req.jsonSchema) {
      body.tools = [
        {
          name: 'output',
          description: 'Return the structured output.',
          input_schema: req.jsonSchema,
        },
      ];
      body.tool_choice = { type: 'tool', name: 'output' };
    }

    const response = await withRetry(
      () => this.client!.messages.create(body as never),
      (err) => this.isTransient(err),
      {
        attempts:
          parseInt(process.env.AI_TRANSIENT_RETRY_ATTEMPTS ?? '2', 10) + 1,
        backoffMs: parseInt(
          process.env.AI_TRANSIENT_RETRY_BACKOFF_MS ?? '500',
          10,
        ),
        timeoutMs: parseInt(process.env.AI_CALL_TIMEOUT_MS ?? '60000', 10),
      },
    );

    let text = '';
    let json: unknown;
    const resp = response as {
      content?: Array<{
        type: string;
        text?: string;
        name?: string;
        input?: unknown;
      }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };
    for (const block of resp.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string')
        text += block.text;
      if (block.type === 'tool_use' && block.name === 'output')
        json = block.input;
    }

    return {
      text,
      json,
      model: resp.model ?? model,
      usage: {
        inputTokens: resp.usage?.input_tokens ?? 0,
        outputTokens: resp.usage?.output_tokens ?? 0,
      },
    };
  }

  isTransient(err: unknown): boolean {
    const anyErr = err as {
      status?: number;
      statusCode?: number;
      code?: string;
    };
    const s = anyErr?.status ?? anyErr?.statusCode;
    if (s === 429) return true;
    if (typeof s === 'number' && s >= 500) return true;
    const code = anyErr?.code;
    return (
      code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNABORTED'
    );
  }
}
