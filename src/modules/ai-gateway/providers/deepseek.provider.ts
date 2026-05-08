import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Capability } from '../types/capability';
import { LlmProvider, ProviderName } from '../types/llm-provider';
import { LlmRequest, LlmResponse } from '../types/llm-request';
import { readOptionalKey, readModelWhenConfigured } from './provider.env';
import { withRetry } from '../internal/retry';
import { InvalidResponseError } from '../internal/error-classifier';

@Injectable()
export class DeepSeekProvider implements LlmProvider {
  readonly name: ProviderName = 'deepseek';
  readonly capabilities = new Set<Capability>(['text', 'json']);
  readonly isConfigured: boolean;
  readonly defaultModel: string;
  private readonly client?: OpenAI;

  constructor() {
    const key = readOptionalKey('DEEPSEEK_API_KEY');
    this.isConfigured = !!key;
    this.defaultModel =
      readModelWhenConfigured('DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL') ?? '';
    if (key) {
      this.client = new OpenAI({
        apiKey: key,
        baseURL: 'https://api.deepseek.com',
      });
    }
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!this.client) throw new Error('DeepSeekProvider is not configured');
    const model = req.modelOverride ?? this.defaultModel;

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = req.messages.map((m) => {
      if (m.role === 'system') {
        return { role: 'system' as const, content: m.text };
      }
      if (m.role === 'assistant') {
        return { role: 'assistant' as const, content: m.text };
      }
      const images = m.images ?? [];
      if (images.length > 0) {
        throw new Error(
          'DeepSeekProvider does not support vision; images were provided on a user message',
        );
      }
      return { role: 'user' as const, content: m.text };
    });

    if (req.jsonSchema) {
      const suffix = `\n\nYou must return JSON matching this schema: ${JSON.stringify(
        req.jsonSchema,
      )}`;
      const systemIndex = messages.findIndex((m) => m.role === 'system');
      if (systemIndex >= 0) {
        messages[systemIndex] = {
          role: 'system',
          content: messages[systemIndex].content + suffix,
        };
      } else {
        messages.unshift({
          role: 'system',
          content: `You are a helpful assistant.${suffix}`,
        });
      }
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: req.temperature ?? 0,
    };
    if (req.maxOutputTokens !== undefined) {
      body.max_tokens = req.maxOutputTokens;
    }
    if (req.jsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    const response = await withRetry(
      () => this.client!.chat.completions.create(body as never),
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

    const resp = response as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const text = resp.choices?.[0]?.message?.content ?? '';
    let json: unknown;
    if (req.jsonSchema) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new InvalidResponseError('DeepSeek returned non-JSON body', text);
      }
    }

    return {
      text,
      json,
      model: resp.model ?? model,
      usage: {
        inputTokens: resp.usage?.prompt_tokens ?? 0,
        outputTokens: resp.usage?.completion_tokens ?? 0,
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
