import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Capability } from '../types/capability';
import { LlmProvider, ProviderName } from '../types/llm-provider';
import { LlmRequest, LlmResponse } from '../types/llm-request';
import { readOptionalKey, readModelWhenConfigured } from './provider.env';
import { withRetry } from '../internal/retry';
import { InvalidResponseError } from '../internal/error-classifier';

function patchAdditionalProperties(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(patchAdditionalProperties);
  const obj = schema as Record<string, unknown>;
  const patched: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    patched[k] = patchAdditionalProperties(v);
  }
  if (patched['type'] === 'object' || patched['properties'] !== undefined) {
    patched['additionalProperties'] = false;
  }
  return patched;
}

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly name: ProviderName = 'openai';
  readonly capabilities = new Set<Capability>(['text', 'vision', 'json']);
  readonly isConfigured: boolean;
  readonly defaultModel: string;
  private readonly client?: OpenAI;

  constructor() {
    const key = readOptionalKey('OPENAI_API_KEY');
    this.isConfigured = !!key;
    this.defaultModel =
      readModelWhenConfigured('OPENAI_API_KEY', 'OPENAI_MODEL') ?? '';
    if (key) this.client = new OpenAI({ apiKey: key });
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!this.client) throw new Error('OpenAiProvider is not configured');
    const model = req.modelOverride ?? this.defaultModel;

    const messages = req.messages.map((m) => {
      if (m.role === 'system') {
        return { role: 'system' as const, content: m.text };
      }
      if (m.role === 'assistant') {
        return { role: 'assistant' as const, content: m.text };
      }
      const images = m.images ?? [];
      if (images.length === 0) {
        return { role: 'user' as const, content: m.text };
      }
      const blocks: unknown[] = [{ type: 'text', text: m.text }];
      for (const img of images) {
        blocks.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mediaType};base64,${img.data.toString('base64')}`,
          },
        });
      }
      return { role: 'user' as const, content: blocks };
    });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: req.temperature ?? 0,
    };
    if (req.maxOutputTokens !== undefined) {
      body.max_tokens = req.maxOutputTokens;
    }

    if (req.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'output',
          strict: true,
          schema: patchAdditionalProperties(req.jsonSchema),
        },
      };
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
        throw new InvalidResponseError(
          'OpenAI returned non-JSON content',
          text,
        );
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
